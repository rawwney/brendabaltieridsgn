import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { patchAboutBrush } from './about-paint-brush.mjs';

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
clientBundle = patchAboutBrush(clientBundle);
clientBundle = clientBundle.replace(
  '];c.sort((e,t)=>e.id-t.id),Array.from',
  '];c=c.filter(e=>e.slug!==`raizes`);var bbOrder=[`sadhu-morning-evening-night`,`guru-spirit-folder`,`guru-spirit-packaging`,`malhafil`,`epj-corrida`,`deposito-23`,`casamar`,`grupo-pirasa`,`fluis`,`vies`,`labirinto-noir`,`ryzon`];c.sort((e,t)=>{let n=bbOrder.indexOf(e.slug),r=bbOrder.indexOf(t.slug);return(n<0?bbOrder.length:n)-(r<0?bbOrder.length:r)||e.id-t.id}),c.forEach((e,t)=>e.id=t+1),Array.from',
);
clientBundle = clientBundle.replace(
  'shortDescription:`Informação institucional transformada em uma narrativa visual de marca.`,description:`Folder institucional desenvolvido para distribuidores da Guru Spirit. A peça organiza portfólio, posicionamento e argumentos comerciais em um sistema editorial direto e visualmente consistente.`',
  'shortDescription:`Carta de produtos criada para aproximar a Guru Spirit de seus distribuidores.`,description:`Folder desenvolvido para apresentar aos distribuidores a carta de produtos da Guru Spirit durante um evento do setor de conveniência.`',
);
clientBundle = clientBundle.replace(
  'shortDescription:`Institutional information shaped into a visual brand narrative.`,description:`Institutional brochure developed for Guru Spirit distributors. The piece organizes the portfolio, positioning and sales arguments into a direct and visually consistent editorial system.`',
  'shortDescription:`A product catalog created to connect Guru Spirit with its distributors.`,description:`Folder designed to present Guru Spirit’s product catalog to distributors during a convenience-industry event.`',
);
clientBundle = clientBundle.replace(
  'gallery:[`/projects/behance/guru-folder-01.webp`,`/projects/behance/guru-folder-02.webp`,`/projects/behance/guru-folder-03.webp`]',
  'gallery:[`/projects/behance/guru-folder-cover.webp`,`/projects/behance/guru-folder-01.webp`,`/projects/behance/guru-folder-02.webp`,`/projects/behance/guru-folder-03.webp`]',
);
clientBundle = clientBundle.replace(
  'gallery:[`/projects/behance/guru-packaging-01.webp`,`/projects/behance/guru-packaging-02.webp`]',
  'gallery:[`/projects/behance/guru-packaging-intro.webp`,`/projects/behance/guru-packaging-01.webp`,`/projects/behance/guru-packaging-02.webp`,`/projects/behance/guru-packaging-03.webp`,`/projects/behance/guru-packaging-04.webp`,`/projects/behance/guru-packaging-05.webp`,`/projects/behance/guru-packaging-06.webp`,`/projects/behance/guru-packaging-07.webp`,`/projects/behance/guru-packaging-08.webp`,`/projects/behance/guru-packaging-09.webp`,`/projects/behance/guru-packaging-10.webp`,`/projects/behance/guru-packaging-11.webp`,`/projects/behance/guru-packaging-12.webp`]',
);
clientBundle = clientBundle.replace(
  'gallery:[`/projects/behance/vies-01.gif`,`/projects/behance/vies-02.webp`]',
  'gallery:[`/projects/behance/vies-01.webp`,`/projects/popup/behance/vies-02-popup.gif`,`/projects/behance/vies-03.webp`,`/projects/behance/vies-04.webp`,`/projects/behance/vies-05.webp`,`/projects/behance/vies-06.webp`,`/projects/behance/vies-07.webp`,`/projects/behance/vies-08.webp`,`/projects/behance/vies-09.webp`,`/projects/behance/vies-10.webp`]',
);
clientBundle = clientBundle.replace(
  'gallery:[`/projects/pdf/labirinto-01.png`,`/projects/pdf/labirinto-02.png`]',
  'gallery:[`/projects/behance/labirinto-01.webp`,`/projects/behance/labirinto-02.webp`,`/projects/behance/labirinto-03.webp`,`/projects/behance/labirinto-04.webp`,`/projects/behance/labirinto-05.webp`,`/projects/behance/labirinto-06.webp`]',
);
clientBundle = clientBundle.replace(
  'gallery:[`/projects/pdf/casamar-01.png`,`/projects/pdf/casamar-02.png`],featured:!0',
  'gallery:[`/projects/pdf/casamar-01.png`,`/projects/pdf/casamar-02.png`,`/projects/pdf/casamar-03.png`,`/projects/pdf/casamar-04.png`,`/projects/pdf/casamar-05.png`],galleryCaptions:[``,`O símbolo da CasaMar une arquitetura e natureza em uma forma simples e orgânica. Seu contorno remete a um portal ou abrigo, enquanto o elemento central representa o movimento natural do mar e da vegetação costeira. A composição reforça a ideia de um refúgio integrado à paisagem.`,``,``,``],featured:!0',
);
clientBundle = clientBundle.replace(
  'description:`Identity created for a beachfront guesthouse in Arraial do Cabo. The brand translates a calm, exclusive and nature-connected experience through a sensory, sophisticated and intimate language.`}',
  'description:`Identity created for a beachfront guesthouse in Arraial do Cabo. The brand translates a calm, exclusive and nature-connected experience through a sensory, sophisticated and intimate language.`,galleryCaptions:[``,`The CasaMar symbol unites architecture and nature in a simple, organic form. Its outline evokes a portal or shelter, while the central element represents the natural movement of the sea and coastal vegetation. The composition reinforces the idea of a retreat integrated into the landscape.`,``,``,``]}',
);
clientBundle = clientBundle.replace(
  'd=o.behanceUrl?l.slice(0,2):l',
  'd=[`guru-spirit-folder`,`guru-spirit-packaging`,`vies`,`labirinto-noir`].includes(o.slug)?l:o.behanceUrl?l.slice(0,2):l',
);
clientBundle = clientBundle.replace(
  'p=[`malhafil`,`guru-spirit-packaging`,`sadhu-morning-evening-night`,`deposito-23`].includes(o.slug)',
  'p=[`malhafil`,`casamar`,`guru-spirit-folder`,`guru-spirit-packaging`,`ryzon`,`sadhu-morning-evening-night`,`deposito-23`,`vies`,`labirinto-noir`].includes(o.slug)',
);
clientBundle = clientBundle.replace(
  'o.behanceUrl&&(0,u.jsx)(`a`,{className:`behance-case-link`',
  'o.behanceUrl&&![`ryzon`,`guru-spirit-packaging`,`vies`].includes(o.slug)&&(0,u.jsx)(`a`,{className:`behance-case-link`',
);
clientBundle = clientBundle.replace(
  'o.slug===`epj-corrida`?`popup-slides-featured-first`:``',
  '[`epj-corrida`,`casamar`].includes(o.slug)?`popup-slides-featured-first`:``',
);
clientBundle = clientBundle.replace(
  'loading:`eager`,decoding:`async`,fetchPriority:t===0?`high`:`auto`',
  'loading:t===0?`eager`:`lazy`,decoding:`async`,fetchPriority:t===0?`high`:`auto`',
);
await writeFile(clientBundlePath, clientBundle, 'utf8');

const indexPath = path.join(outputRoot, 'index.html');
let indexHtml = await readFile(indexPath, 'utf8');

const assetRevision = async (fileName) => createHash('sha256')
  .update(await readFile(path.join(outputRoot, fileName)))
  .digest('hex')
  .slice(0, 10);

const responsiveRevision = await assetRevision('responsive-fixes.css');
const performanceRevision = await assetRevision('performance.js');
indexHtml = indexHtml.replace(
  /\/responsive-fixes\.css(?:\?v=[^"']*)?/g,
  `/responsive-fixes.css?v=${responsiveRevision}`,
);
if (!indexHtml.includes('/performance.js')) {
  indexHtml = indexHtml.replace(
    '</body>',
    `<script src="/performance.js?v=${performanceRevision}" defer></script></body>`,
  );
} else {
  indexHtml = indexHtml.replace(
    /\/performance\.js(?:\?v=[^"']*)?/g,
    `/performance.js?v=${performanceRevision}`,
  );
}

const siteOrigin = (process.env.SITE_ORIGIN || 'https://brendabaltieridsgn.pages.dev').replace(/\/$/, '');
const socialImagePath = 'brand/brenda-frontal-green.png';
const socialImage = await sharp(path.join(outputRoot, socialImagePath)).metadata();
indexHtml = indexHtml.replaceAll(
  'http://localhost:3000/og.png',
  `${siteOrigin}/${socialImagePath}`,
);
indexHtml = indexHtml.replace('name="twitter:card" content="summary_large_image"', 'name="twitter:card" content="summary"');
indexHtml = indexHtml.replace('</head>',
  `<meta property="og:image:width" content="${socialImage.width}"/>`
  + `<meta property="og:image:height" content="${socialImage.height}"/>`
  + '<meta property="og:image:type" content="image/png"/>'
  + '<meta property="og:image:alt" content="Ícone frontal de Brenda Baltieri com fones verdes sobre fundo roxo"/>'
  + '<meta name="twitter:image:alt" content="Ícone frontal de Brenda Baltieri com fones verdes sobre fundo roxo"/>'
  + '</head>');
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
