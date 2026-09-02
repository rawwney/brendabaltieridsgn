import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sourceRoot = path.join(projectRoot, 'static');
const outputRoot = path.join(projectRoot, 'dist');

if (path.dirname(outputRoot) !== projectRoot || path.basename(outputRoot) !== 'dist') {
  throw new Error('Refusing to replace an unexpected output directory.');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

async function sumBytes(files) {
  let total = 0;
  for (const file of files) total += (await stat(file)).size;
  return total;
}

async function makeWebp(input, outputPath, width, quality) {
  await sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(outputPath);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(sourceRoot, outputRoot, { recursive: true });

const projectRootInOutput = path.join(outputRoot, 'projects');
const projectFiles = await walk(projectRootInOutput);
let derivativeCount = 0;

for (const imagePath of projectFiles) {
  const extension = path.extname(imagePath).toLowerCase();
  if (!['.webp', '.png'].includes(extension) || /-(?:mobile|desktop)\.webp$/i.test(imagePath)) {
    continue;
  }

  const basePath = imagePath.slice(0, -extension.length);
  const mobilePath = `${basePath}-mobile.webp`;
  const desktopPath = `${basePath}-desktop.webp`;
  const sourceImage = await readFile(imagePath);
  await makeWebp(sourceImage, mobilePath, 960, 90);
  await makeWebp(sourceImage, desktopPath, 2000, 93);
  derivativeCount += 2;

  if (extension === '.webp') {
    const metadata = await sharp(sourceImage).metadata();
    const fileStats = await stat(imagePath);
    if ((metadata.width ?? 0) > 2400 || fileStats.size > 600 * 1024) {
      const optimizedImage = await sharp(sourceImage)
        .rotate()
        .resize({ width: 2400, withoutEnlargement: true })
        .webp({ quality: 94, alphaQuality: 100, effort: 6, smartSubsample: true })
        .toBuffer();
      await writeFile(imagePath, optimizedImage);
    }
  }
}

const ogPath = path.join(outputRoot, 'og.png');
const ogImage = await readFile(ogPath);
const optimizedOg = await sharp(ogImage)
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre', withoutEnlargement: true })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer();
await writeFile(ogPath, optimizedOg);

const clientBundlePath = path.join(
  outputRoot,
  '_next',
  'static',
  'chunks',
  'PortfolioClient-Cfijaua1.js',
);
let clientBundle = await readFile(clientBundlePath, 'utf8');
clientBundle = clientBundle.replace(
  'loading:`eager`,decoding:`async`,fetchPriority:t===0?`high`:`auto`',
  'loading:t===0?`eager`:`lazy`,decoding:`async`,fetchPriority:t===0?`high`:`auto`',
);
await writeFile(clientBundlePath, clientBundle, 'utf8');

const indexPath = path.join(outputRoot, 'index.html');
let indexHtml = await readFile(indexPath, 'utf8');
if (!indexHtml.includes('/performance.js')) {
  indexHtml = indexHtml.replace('</body>', '<script src="/performance.js" defer></script></body>');
}

const siteOrigin = process.env.SITE_ORIGIN?.replace(/\/$/, '');
indexHtml = indexHtml.replaceAll(
  'http://localhost:3000/og.png',
  siteOrigin ? `${siteOrigin}/og.png` : '/og.png',
);
await writeFile(indexPath, indexHtml, 'utf8');

const beforeBytes = await sumBytes(await walk(sourceRoot));
const afterBytes = await sumBytes(await walk(outputRoot));

console.log(
  JSON.stringify({
    output: outputRoot,
    responsiveImageDerivatives: derivativeCount,
    sourceBytes: beforeBytes,
    deployedBytes: afterBytes,
  }),
);
