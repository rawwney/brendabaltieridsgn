import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { patchAboutBrush } from './about-paint-brush.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sourceRoot = path.join(projectRoot, 'static');
const finalOutputRoot = path.join(projectRoot, 'dist');
const outputRoot = path.join(projectRoot, '.dist-build');
const previousOutputRoot = path.join(projectRoot, '.dist-previous');

if (
  path.dirname(finalOutputRoot) !== projectRoot
  || path.basename(finalOutputRoot) !== 'dist'
  || path.dirname(outputRoot) !== projectRoot
  || path.basename(outputRoot) !== '.dist-build'
) {
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

const projectCopyReplacements = [
  [
    'shortDescription:`Três momentos, três atmosferas e um único sistema visual.`,description:`Rebranding da linha Morning, Evening e Night para o Sadhu Group. O projeto conecta embalagens, ilustração e visualização de produto em uma família gráfica coesa, expressiva e reconhecível.`',
    'shortDescription:`Três momentos. Três atmosferas. Uma mesma linha.`,description:`Morning, Evening e Night deixam de funcionar como produtos isolados e passam a ser apresentados como uma linha construída em torno de três momentos do dia. Desenvolvi a direção visual conectando ilustração, cor, embalagem e visualização 3D para criar unidade entre as três atmosferas sem apagar suas diferenças. O resultado é uma família de produtos que compartilha a mesma lógica visual e permite reconhecer cada momento de forma imediata.`',
  ],
  [
    'shortDescription:`Informação institucional transformada em uma narrativa visual de marca.`,description:`Folder institucional desenvolvido para distribuidores da Guru Spirit. A peça organiza portfólio, posicionamento e argumentos comerciais em um sistema editorial direto e visualmente consistente.`',
    'shortDescription:`Informação de produto organizada para apresentar, consultar e vender.`,description:`Desenvolvido para apresentar a carta de produtos da Guru Spirit a distribuidores durante um evento do setor de conveniência, o folder organiza conteúdo comercial em uma peça de consulta clara e direta. Minha atuação envolveu direção de arte e editorial, trabalhando hierarquia, ritmo de página e relação entre informação e imagem para tornar o portfólio fácil de percorrer sem perder a identidade da marca.`',
  ],
  [
    'shortDescription:`Embalagem e visualização para uma presença de produto mais intensa.`,description:`Estudo de embalagem e visualização tridimensional para a Guru Spirit, explorando materialidade, contraste e apresentação de produto com acabamento publicitário.`',
    'shortDescription:`Da superfície ao volume: embalagem pensada também em 3D.`,description:`O projeto de embalagem da Guru Spirit explora a relação entre aplicação gráfica, materialidade e visualização de produto. A linguagem desenvolvida para a superfície da embalagem é levada aos mockups em Adobe Dimension e Blender, permitindo apresentar o design em volume e em contextos mais próximos de uma peça publicitária. O 3D funciona como extensão do projeto, conectando o layout bidimensional à percepção final do produto.`',
  ],
  [
    'shortDescription:`O verde que acolhe em meio à imensidão azul.`,description:`Identidade criada para uma pousada pé na areia em Arraial do Cabo. A marca traduz uma experiência tranquila, exclusiva e conectada à natureza por meio de uma linguagem sensorial, sofisticada e intimista.`',
    'shortDescription:`O verde que acolhe em meio à imensidão azul.`,description:`CasaMar é uma pousada pé na areia em Arraial do Cabo. A identidade foi desenvolvida a partir da relação entre arquitetura e natureza: o contorno do símbolo remete a um portal ou abrigo, enquanto seu elemento central traz o movimento do mar e da vegetação costeira. A partir desse conceito, a linguagem visual constrói uma marca ligada ao acolhimento, à paisagem e à experiência de estar junto ao mar.`',
  ],
  [
    'shortDescription:`Uma identidade imersiva, urbana e construída para a noite.`,description:`Identidade visual para uma casa noturna de entretenimento com posicionamento premium. Contrastes marcantes, tipografia expressiva e cores vibrantes criam uma atmosfera enigmática e sensorial.`',
    'shortDescription:`Mistério, contraste e intensidade para uma marca feita para a noite.`,description:`Para o Labirinto Noir, uma casa noturna de posicionamento premium, a identidade foi construída a partir do contraste entre mistério e intensidade. Tipografia expressiva, cores vibrantes e composições de alto contraste definem uma atmosfera própria para a marca e orientam seu desdobramento entre peças digitais e impressas. A direção de arte cria unidade sem depender de um único recurso gráfico para gerar reconhecimento.`',
  ],
  [
    'shortDescription:`Uma identidade sobre liberdade, movimento e expressão sem rótulos.`,description:`Sistema de identidade visual com linguagem vibrante, tipografia direta e elementos gráficos em movimento, criado para celebrar pluralidade e liberdade de expressão.`',
    'shortDescription:`Liberdade, movimento e expressão sem rótulos.`,description:`VIÉS nasce de uma ideia central: liberdade sem rótulos. A identidade combina tipografia direta, cores vibrantes e elementos gráficos em movimento para construir uma linguagem associada à pluralidade e à expressão. O motion amplia esse conceito para além das aplicações estáticas, fazendo com que logotipo, composição e animação funcionem como partes da mesma identidade.`',
  ],
  [
    'shortDescription:`Força, movimento e profissionalismo materializados em marca.`,description:`Redesign de logotipo e aplicações impressas para a Ryzon. A identidade explora contrastes, hierarquia visual e acabamento sóbrio em cartão de visitas, sacola e peças físicas.`',
    'shortDescription:`Um redesign pensado para funcionar além do logotipo.`,description:`O projeto da Ryzon parte do redesign do logotipo e leva a nova assinatura visual para diferentes aplicações impressas. Contraste, hierarquia e um acabamento mais sóbrio orientam o novo desenho e seus desdobramentos em cartão de visitas, sacola e outras peças físicas. As aplicações mostram como a identidade se comporta em diferentes escalas e materiais, indo além da apresentação isolada do logotipo.`',
  ],
  [
    'shortDescription:`Performance esportiva com uma presença digital limpa, direta e em movimento.`,description:`Renovação visual do Instagram da EPJ Corrida. A direção de arte usa as cores sólidas da marca e animações construídas a partir de elementos em PNG para manter unidade, ritmo e presença entre as peças.`',
    'shortDescription:`Uma linguagem visual em movimento com o ritmo do esporte.`,description:`Para a EPJ Corrida, desenvolvi uma renovação visual para o Instagram, criando uma linguagem mais consistente para conteúdos relacionados a esporte, saúde e qualidade de vida. As cores sólidas da marca, composições diretas e uma estrutura adaptável orientam as peças e datas comemorativas. O case também reúne motions da identidade anterior, apresentados separadamente para contextualizar a evolução visual da comunicação.`',
  ],
  [
    'shortDescription:`Campanhas promocionais que valorizam produto sem perder reconhecimento de marca.`,description:`Projeto de mídias sociais para a Malhafil, loja de pijamas, lingeries, bolsas, nécessaires e outros acessórios. As peças preservam a identidade já consolidada e combinam tratamento de imagens, hierarquia e recursos visuais para campanhas promocionais digitais.`',
    'shortDescription:`Diferentes campanhas, uma marca sempre reconhecível.`,description:`Na Agência Trêes, desenvolvi direções de arte para diferentes campanhas da Malhafil, entre lançamentos, datas sazonais e parcerias com outras marcas. O trabalho envolveu tratamento e recorte de produtos, criação de elementos de campanha, imagens produzidas com apoio de IA a partir de materiais fornecidos e adaptação para diferentes formatos. Cada ação ganha uma atmosfera própria sem perder a continuidade visual da comunicação da marca.`',
  ],
  [
    'shortDescription:`Produtos, marca e calendário reunidos em um sistema visual consistente.`,description:`Projeto de mídias sociais para a Depósito 23, desenvolvido na Agência Trêes. O trabalho reuniu tratamento e padronização de imagens, aplicação consistente da tag da marca e criação de uma nova identidade anual para as artes comemorativas do Instagram.`',
    'shortDescription:`Produto e calendário conectados pela mesma direção visual.`,description:`Na comunicação da Depósito 23, desenvolvida na Agência Trêes, o trabalho reuniu diferentes necessidades recorrentes da marca: tratamento e padronização de imagens de produto, aplicação da tag da Depósito 23 e criação de uma identidade anual para datas comemorativas. Paleta suave, formas orgânicas e composições adaptáveis ajudam a conectar esses conteúdos, mantendo o produto como protagonista ao longo do calendário.`',
  ],
  [
    'shortDescription:`Uma peça autoral onde estratégia, cor e ritmo entram no bloco.`,description:`Campanha institucional de Carnaval criada integralmente para a Agência Trêes, incluindo conceito, copywriting, ilustrações e layout final, com IA como apoio criativo.`',
    'shortDescription:`Conceito, texto e ilustração no mesmo ritmo.`,description:`Criei a campanha institucional de Carnaval da Agência Trêes do conceito ao layout final. Minha atuação reuniu direção de arte, copywriting e ilustração, com inteligência artificial utilizada como apoio durante o processo criativo. Texto, imagem, cor e ritmo foram desenvolvidos em conjunto para construir uma peça em que linguagem verbal e visual partem da mesma ideia.`',
  ],
  [
    'shortDescription:`Comunicação corporativa com unidade, informação e presença.`,description:`Planejamento visual para o cronograma mensal de mídias sociais do Grupo Pirasa, reunindo posts estáticos e vídeos em uma comunicação informativa, consistente e alinhada à identidade da marca.`',
    'shortDescription:`Diferentes pautas organizadas dentro da mesma comunicação.`,description:`Na Agência Trêes, trabalhei a comunicação mensal do Grupo Pirasa a partir de conteúdos de diferentes frentes do negócio. Posts estáticos e vídeos abordam temas institucionais, serviços, mobilidade, datas relevantes e responsabilidade ambiental. A direção de arte organiza essa variedade de pautas dentro de uma linguagem comum, permitindo que cada conteúdo tenha sua própria abordagem sem fragmentar a comunicação do grupo nas redes.`',
  ],
  [
    'shortDescription:`Informação sobre saúde auditiva com cuidado, clareza e consistência.`,description:`Campanha para clínica especializada em saúde auditiva. O pilar informativo educa pacientes com curadoria visual, imagens e ilustrações geradas com apoio de inteligência artificial.`',
    'shortDescription:`Saúde auditiva traduzida em informação clara e acessível.`,description:`Para a Fluis, clínica especializada em saúde auditiva, desenvolvi um pilar informativo voltado à educação de pacientes. A direção de arte foi pensada para apresentar assuntos técnicos de forma clara e acessível, combinando curadoria visual com imagens e ilustrações produzidas com apoio de inteligência artificial. O trabalho cria continuidade entre os conteúdos e sustenta uma comunicação cuidadosa para a clínica nas redes sociais.`',
  ],
];

for (const [currentCopy, nextCopy] of projectCopyReplacements) {
  if (!clientBundle.includes(currentCopy)) {
    throw new Error(`Missing project copy during build: ${currentCopy.slice(0, 80)}`);
  }
  clientBundle = clientBundle.replace(currentCopy, nextCopy);
}

const projectEnglishCopyReplacements = [
  [
    "shortDescription:`Three moments, three atmospheres and one visual system.`,description:`Rebranding of Sadhu Group's Morning, Evening and Night line. The project connects packaging, illustration and product visualization in one cohesive, expressive and recognizable graphic family.`",
    "shortDescription:`Three moments. Three atmospheres. One product line.`,description:`Rebranding of Sadhu Group's Morning, Evening and Night line. The project connects packaging, illustration and product visualization in one cohesive, expressive and recognizable graphic family.`",
  ],
  [
    'shortDescription:`Institutional information shaped into a visual brand narrative.`,description:`Institutional brochure developed for Guru Spirit distributors. The piece organizes the portfolio, positioning and sales arguments into a direct and visually consistent editorial system.`',
    'shortDescription:`Product information organized to present, navigate, and sell.`,description:`Developed to present Guru Spirit’s product range to distributors during a convenience industry event, this institutional brochure organizes commercial content into a clear and straightforward reference piece. My role involved art direction and editorial design, working with hierarchy, page rhythm, and the relationship between information and imagery to make the portfolio easy to navigate while preserving the brand’s identity.`',
  ],
  [
    'shortDescription:`Packaging and visualization for a stronger product presence.`,description:`Packaging and three-dimensional visualization study for Guru Spirit, exploring materiality, contrast and advertising-grade product presentation.`',
    'shortDescription:`From surface to volume: packaging designed with 3D in mind.`,description:`Guru Spirit’s packaging project explores the relationship between graphic application, materiality, and product visualization. The visual language developed for the packaging surface is carried into 3D mockups, making it possible to evaluate the design in volume and present it in contexts closer to advertising imagery. The 3D visualization works as an extension of the project, connecting the two-dimensional layout to the final perception of the product.`',
  ],
  [
    'shortDescription:`A welcoming green presence within an endless blue landscape.`,description:`Identity created for a beachfront guesthouse in Arraial do Cabo. The brand translates a calm, exclusive and nature-connected experience through a sensory, sophisticated and intimate language.`',
    'shortDescription:`A welcoming green presence surrounded by endless blue.`,description:`CasaMar is a beachfront guesthouse in Arraial do Cabo. The identity was developed around the relationship between architecture and nature: the outline of the symbol suggests a portal or shelter, while its central element evokes the movement of the sea and coastal vegetation. From this concept, the visual language builds a brand connected to a sense of welcome, the surrounding landscape, and the experience of being by the sea.`',
  ],
  [
    'shortDescription:`An immersive urban identity built for the night.`,description:`Visual identity for a premium nightlife venue. Bold contrasts, expressive typography and vibrant colors create an enigmatic and sensory atmosphere.`',
    'shortDescription:`Mystery, contrast, and intensity for a brand made for the night.`,description:`For Labirinto Noir, a nightclub positioned in the premium segment, the identity was built around the contrast between mystery and intensity. Expressive typography, vibrant colors, and high-contrast compositions define a distinctive atmosphere for the brand and guide its application across digital and print materials. The art direction creates cohesion without relying on a single graphic device to build recognition.`',
  ],
  [
    'shortDescription:`An identity about freedom, movement and expression beyond labels.`,description:`A visual identity system with vibrant language, direct typography and moving graphic elements, created to celebrate plurality and freedom of expression.`',
    'shortDescription:`Freedom, movement, and expression beyond labels.`,description:`VIÉS was built around one central idea: freedom beyond labels. The identity combines direct typography, vibrant colors, and graphic elements in motion to create a visual language associated with plurality and self-expression. Motion extends this concept beyond static applications, allowing the logo, composition, and animation to work as interconnected parts of the same identity.`',
  ],
  [
    'shortDescription:`Strength, movement and professionalism embodied in a brand.`,description:`Logo redesign and printed applications for Ryzon. The identity explores contrast, visual hierarchy and a refined finish across business cards, bags and physical pieces.`',
    'shortDescription:`A redesign created to work beyond the logo.`,description:`The Ryzon project begins with a logo redesign and extends the new visual signature across a range of printed applications. Contrast, hierarchy, and a more restrained visual approach guide the new design and its applications across business cards, bags, and other physical materials. These touchpoints demonstrate how the identity performs across different scales and materials, moving beyond the logo as an isolated element.`',
  ],
  [
    "shortDescription:`Athletic performance with a clean, direct and dynamic digital presence.`,description:`Visual refresh for EPJ Corrida's Instagram. The art direction uses the brand's solid colors and animations built from PNG elements to maintain unity, rhythm and presence across the pieces.`",
    "shortDescription:`A visual language that keeps pace with the rhythm of sport.`,description:`For EPJ Corrida, I developed a visual refresh for Instagram, creating a more consistent language for content related to sports, health, and well-being. The brand’s solid colors, direct compositions, and an adaptable structure guide both regular content and commemorative posts. The case also includes motion pieces from the previous identity, presented separately to provide context for the evolution of the brand’s visual communication.`",
  ],
  [
    'shortDescription:`Promotional campaigns that highlight products without losing brand recognition.`,description:`Social media project for Malhafil, a store offering pajamas, lingerie, bags, toiletry bags and other accessories. The pieces preserve its established identity and combine image treatment, hierarchy and visual resources for digital promotional campaigns.`',
    'shortDescription:`Different campaigns, one consistently recognizable brand.`,description:`At Agência Trêes, I developed the art direction for several Malhafil campaigns, including product launches, seasonal initiatives, and brand partnerships. The work involved image treatment and product cutouts, the creation of campaign elements, AI-assisted imagery based on supplied assets, and adaptations across multiple formats. Each campaign establishes its own atmosphere while maintaining visual continuity across the brand’s communication.`',
  ],
  [
    'shortDescription:`Hearing-health information presented with care, clarity and consistency.`,description:`Campaign for a hearing-health clinic. The informational pillar educates patients through visual curation and AI-assisted images and illustrations.`',
    'shortDescription:`Hearing health translated into clear, accessible information.`,description:`For Fluis, a clinic specializing in hearing health, I developed an informational content pillar focused on patient education. The art direction was designed to present technical subjects in a clear and accessible way, combining visual curation with AI-assisted images and illustrations. The work creates continuity across the content while supporting a thoughtful and consistent approach to the clinic’s social media communication.`',
  ],
  [
    'shortDescription:`An original piece where strategy, color and rhythm join the parade.`,description:`Institutional Carnival campaign created end-to-end for Agência Trêes, including concept, copywriting, illustrations and final layout, with AI as a creative support tool.`',
    'shortDescription:`Concept, copy, and illustration moving to the same rhythm.`,description:`I created Agência Trêes’ institutional Carnival campaign from concept through final layout. My role brought together art direction, copywriting, and illustration, with artificial intelligence used as a supporting tool during the creative process. Copy, imagery, color, and rhythm were developed together to create a piece in which verbal and visual language stem from the same idea.`',
  ],
  [
    "shortDescription:`Corporate communication with unity, information and presence.`,description:`Visual planning for Grupo Pirasa's monthly social media schedule, bringing static posts and videos together in an informative, consistent communication system aligned with the brand identity.`",
    "shortDescription:`Different topics organized within one cohesive communication system.`,description:`At Agência Trêes, I worked on Grupo Pirasa’s monthly communication across content from different areas of the business. Static posts and videos cover institutional topics, services, mobility, relevant dates, and environmental responsibility. The art direction organizes this range of subjects within a shared visual language, allowing each piece to have its own approach without fragmenting the group’s communication across social media.`",
  ],
  [
    'shortDescription:`Products, brand and calendar brought together in one consistent visual system.`,description:`Social media project for Depósito 23, developed at Agência Trêes. The work combined image treatment and standardization, consistent use of the brand tag and a new annual visual identity for commemorative Instagram posts.`',
    'shortDescription:`Product and calendar connected through the same art direction.`,description:`For Depósito 23’s communication at Agência Trêes, the work brought together several recurring brand needs: product image treatment and standardization, consistent use of the Depósito 23 tag, and the development of an annual visual identity for commemorative dates. A soft color palette, organic shapes, and adaptable compositions connect these different types of content while keeping the product at the center of the communication throughout the year.`',
  ],
];

for (const [currentCopy, nextCopy] of projectEnglishCopyReplacements) {
  if (!clientBundle.includes(currentCopy)) {
    throw new Error(`Missing English project copy during build: ${currentCopy.slice(0, 80)}`);
  }
  clientBundle = clientBundle.replace(currentCopy, nextCopy);
}

const projectQuoteMarkup = ',(0,u.jsxs)(`div`,{className:`gallery-quote`,children:[`“`,o.shortDescription,`”`]})';
if (!clientBundle.includes(projectQuoteMarkup)) {
  throw new Error('Missing project closing quote markup during build.');
}
clientBundle = clientBundle.replace(projectQuoteMarkup, '');

clientBundle = clientBundle.replace(
  '];c.sort((e,t)=>e.id-t.id),Array.from',
  '];var bbOrder=[`sadhu-morning-evening-night`,`casamar`,`ryzon`,`labirinto-noir`,`guru-spirit-packaging`,`guru-spirit-folder`,`grupo-pirasa`,`deposito-23`,`epj-corrida`,`malhafil`,`agencia-trees`,`fluis`,`vies`];c.sort((e,t)=>{let n=bbOrder.indexOf(e.slug),r=bbOrder.indexOf(t.slug);return(n<0?bbOrder.length:n)-(r<0?bbOrder.length:r)||e.id-t.id}),c.forEach((e,t)=>e.id=t+1),Array.from',
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
  'gallery:[`/projects/behance/sadhu-morning-slide-01.webp`,`/projects/behance/sadhu-morning-slide-02.webp`]',
  'gallery:[`/projects/behance/sadhu-morning-01.webp`,`/projects/behance/sadhu-morning-02.webp`,`/projects/behance/sadhu-morning-03.webp`,`/projects/behance/sadhu-morning-04.webp`,`/projects/behance/sadhu-morning-05.gif`,`/projects/behance/sadhu-morning-06.webp`,`/projects/behance/sadhu-morning-07.gif`,`/projects/behance/sadhu-morning-08.webp`,`/projects/behance/sadhu-morning-09.gif`,`/projects/behance/sadhu-morning-10.webp`,`/projects/behance/sadhu-morning-11.gif`,`/projects/behance/sadhu-morning-12.webp`,`/projects/behance/sadhu-morning-13.webp`,`/projects/behance/sadhu-morning-14.webp`,`/projects/behance/sadhu-morning-15.webp`,`/projects/behance/sadhu-morning-16.webp`,`/projects/behance/sadhu-morning-17.webp`,`/projects/behance/sadhu-morning-18.webp`,`/projects/behance/sadhu-morning-19.webp`,`/projects/behance/sadhu-morning-20.webp`,`/projects/behance/sadhu-morning-21.webp`,`/projects/behance/sadhu-morning-22.webp`,`/projects/behance/sadhu-morning-23.webp`,`/projects/behance/sadhu-morning-24.webp`,`/projects/behance/sadhu-morning-25.webp`,`/projects/behance/sadhu-morning-26.webp`,`/projects/behance/sadhu-morning-27.webp`,`/projects/behance/sadhu-morning-28.webp`,`/projects/behance/sadhu-morning-29.webp`,`/projects/behance/sadhu-morning-30.webp`,`/projects/behance/sadhu-morning-31.webp`,`/projects/behance/sadhu-morning-32.webp`,`/projects/behance/sadhu-morning-33.webp`,`/projects/behance/sadhu-morning-34.webp`,`/projects/behance/sadhu-morning-35.webp`,`/projects/behance/sadhu-morning-36.webp`]',
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
  'cover:`/projects/pdf/agencia-trees-01.png`,gallery:[`/projects/pdf/agencia-trees-01.png`,`/projects/pdf/agencia-trees-02.png`]',
  'cover:`/projects/agencia-trees/cover.webp`,gallery:[`/projects/agencia-trees/cover.webp`,`/projects/agencia-trees/slide-02.webp`,`/projects/agencia-trees/slide-03.webp`,`/projects/agencia-trees/slide-04.webp`,`/projects/agencia-trees/slide-05.webp`,`/projects/agencia-trees/slide-06.webp`,`/projects/agencia-trees/slide-07.webp`]',
);
clientBundle = clientBundle.replace(
  'description:`Identity created for a beachfront guesthouse in Arraial do Cabo. The brand translates a calm, exclusive and nature-connected experience through a sensory, sophisticated and intimate language.`}',
  'description:`Identity created for a beachfront guesthouse in Arraial do Cabo. The brand translates a calm, exclusive and nature-connected experience through a sensory, sophisticated and intimate language.`,galleryCaptions:[``,`The CasaMar symbol unites architecture and nature in a simple, organic form. Its outline evokes a portal or shelter, while the central element represents the natural movement of the sea and coastal vegetation. The composition reinforces the idea of a retreat integrated into the landscape.`,``,``,``]}',
);
clientBundle = clientBundle.replace(
  'd=o.behanceUrl?l.slice(0,2):l',
  'd=[`sadhu-morning-evening-night`,`guru-spirit-folder`,`guru-spirit-packaging`,`vies`,`labirinto-noir`].includes(o.slug)?l:o.behanceUrl?l.slice(0,2):l',
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
clientBundle = clientBundle.replace(
  '[D,P]=(0,r.useState)(!0),[F,I]',
  '[D,P]=(0,r.useState)(()=>{try{return![`pt`,`en`].includes(window.localStorage.getItem(`brenda-portfolio-language`))}catch{return!0}}),[F,I]',
);
clientBundle = clientBundle.replace(
  'window.history.replaceState(null,``,`${e.pathname}${e.search}${e.hash}`)):P(!0)},[])',
  'window.history.replaceState(null,``,`${e.pathname}${e.search}${e.hash}`)):P(!r)},[])',
);
const projectCardCtaMarkup = ',(0,u.jsx)(`span`,{className:`project-cta`,children:V.viewProject})';
if (!clientBundle.includes(projectCardCtaMarkup)) {
  throw new Error('Missing project card CTA markup during build.');
}
clientBundle = clientBundle.replace(projectCardCtaMarkup, '');
await writeFile(clientBundlePath, clientBundle, 'utf8');

const indexPath = path.join(outputRoot, 'index.html');
let indexHtml = await readFile(indexPath, 'utf8');
indexHtml = indexHtml.replace(
  'src="/projects/pdf/agencia-trees-01.png" alt="Capa do projeto AGÊNCIA TRÊES / CARNAVAL"',
  'src="/projects/agencia-trees/cover.webp" alt="Capa do projeto AGÊNCIA TRÊES / CARNAVAL"',
);

// Install the boot cover before styles or hydration can paint the base hero.
// performance.js removes it only after the final hero structure, fonts and
// measurements are ready; the timeout prevents a permanent cover if JS fails.
indexHtml = indexHtml.replace(
  '<head>',
  '<head><script>document.documentElement.classList.add("portfolio-booting");try{const savedLanguage=localStorage.getItem("brenda-portfolio-language");if(savedLanguage==="pt"||savedLanguage==="en")document.documentElement.lang=savedLanguage==="pt"?"pt-BR":"en"}catch{}window.__portfolioBootTimeout=setTimeout(()=>document.documentElement.classList.remove("portfolio-booting","portfolio-revealing"),2500);</script><style>html.portfolio-booting,html.portfolio-booting body{background:#000}html.portfolio-booting::before{content:"";position:fixed;z-index:250;inset:0;background:#000;opacity:1;pointer-events:auto;transition:opacity 260ms cubic-bezier(.22,1,.36,1)}html.portfolio-booting.portfolio-revealing::before{opacity:0;pointer-events:none}</style>',
);

if (!indexHtml.includes('https://use.typekit.net/ndf7wpk.css')) {
  indexHtml = indexHtml.replace(
    '</head>',
    '<link rel="preconnect" href="https://use.typekit.net"/>'
      + '<link rel="stylesheet" href="https://use.typekit.net/ndf7wpk.css"/>'
      + '</head>',
  );
}

// Keep the server-rendered project archive in the same order as the patched
// client data. Otherwise React has to discard the archive during hydration,
// which can interrupt the site's interaction layers while it recovers.
const projectMarkupPattern = /<article class="project [^"]+">[\s\S]*?<\/article>/g;
const projectMarkup = [...indexHtml.matchAll(projectMarkupPattern)].map((match) => match[0]);
const projectMarkupByTitle = new Map(projectMarkup.map((article) => {
  const title = article.match(/class="project-title">([^<]+)<\/span>/)?.[1];
  return [title, article];
}));
const staticProjectOrder = [
  'MORNING / EVENING / NIGHT',
  'CASAMAR',
  'RYZON',
  'LABIRINTO NOIR',
  'GURU SPIRIT / PACKAGING',
  'GURU SPIRIT / FOLDER',
  'GRUPO PIRASA',
  'DEPÓSITO 23',
  'EPJ CORRIDA',
  'MALHAFIL',
  'AGÊNCIA TRÊES / CARNAVAL',
  'FLUIS',
  'VIÉS / LIBERDADE SEM RÓTULOS',
];
const orderedProjectMarkup = staticProjectOrder.map((title, index) => {
  const article = projectMarkupByTitle.get(title);
  if (!article) throw new Error(`Missing server-rendered project: ${title}`);
  const number = String(index + 1).padStart(2, '0');
  return article
    .replace(/class="project-number">\d{2}<\/span>/, `class="project-number">${number}</span>`)
    .replace(/class="poster-index">BB—<!-- -->\d{2}<\/span>/, `class="poster-index">BB—<!-- -->${number}</span>`);
});
let projectMarkupIndex = 0;
indexHtml = indexHtml.replace(projectMarkupPattern, () => {
  projectMarkupIndex += 1;
  return projectMarkupIndex === 1 ? orderedProjectMarkup.join('') : '';
});
indexHtml = indexHtml.replace(
  'ARQUIVO<!-- --> [<!-- -->14<!-- -->]',
  'ARQUIVO<!-- --> [<!-- -->13<!-- -->]',
);
indexHtml = indexHtml.replace(/<span class="project-cta">[^<]*<\/span>/g, '');

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

// Build in isolation, then swap the complete directory into place. This keeps
// the local preview from briefly serving a half-built, unstyled site while
// responsive images and patched interaction assets are still being generated.
await rm(previousOutputRoot, { recursive: true, force: true });
let movedPreviousOutput = false;
try {
  await rename(finalOutputRoot, previousOutputRoot);
  movedPreviousOutput = true;
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

try {
  await rename(outputRoot, finalOutputRoot);
} catch (error) {
  if (movedPreviousOutput) await rename(previousOutputRoot, finalOutputRoot);
  throw error;
}

await rm(previousOutputRoot, { recursive: true, force: true });

console.log(
  JSON.stringify({
    output: finalOutputRoot,
    responsiveImageDerivatives: derivativeCount,
    sourceBytes: beforeBytes,
    deployedBytes: afterBytes,
  }),
);
