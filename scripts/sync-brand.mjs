import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = path.join(root, 'GDGoC_LogoPack', 'GDGoC_AAST_Aswan_Logo_Pack');
const vectors = path.join(pack, '07_SVG_Vectors');
const output = path.join(root, 'public', 'assets', 'brand');
await mkdir(output, { recursive: true });

// Copy the supplied artwork exactly, including its outlined lettering and colors.
const files = {
  'gdgoc-learn-mark.svg': 'Icon_Four_Color.svg',
  'gdgoc-learn-lockup.svg': 'Full_Color_For_Light.svg',
  'gdgoc-learn-lockup-white.svg': 'Full_All_White.svg',
  'gdgoc-mark-white.svg': 'Icon_White.svg',
  'gdgoc-mark-black.svg': 'Icon_Black.svg',
  'gdgoc-mark-blue.svg': 'Icon_Brand_Blue.svg',
  'gdgoc-full-dark.svg': 'Full_Color_For_Dark.svg',
  'gdgoc-stacked-light.svg': 'Stacked_For_Light.svg',
};
for (const [filename, source] of Object.entries(files)) await copyFile(path.join(vectors, source), path.join(output, filename));
await copyFile(path.join(pack, '05_Social_Avatars', 'Avatar_Icon_Light_1024.png'), path.join(output, 'gdgoc-touch-icon.png'));

const svgBody = svg => {
  const match = svg.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/);
  if (!match) throw new Error('Invalid logo SVG in GDGoC_LogoPack.');
  return match[1];
};
const mark = await readFile(path.join(output, 'gdgoc-learn-mark.svg'), 'utf8');
// Add square canvas space for browser tabs; the mark itself is unchanged.
await writeFile(path.join(output, 'gdgoc-favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(0 96)">${svgBody(mark)}</g></svg>\n`);

const full = await readFile(path.join(output, 'gdgoc-learn-lockup.svg'), 'utf8');
const certificateFile = path.join(root, 'public', 'assets', 'illustrations', 'season-certificate.svg');
const certificate = await readFile(certificateFile, 'utf8');
const certificateLogo = `<svg id="certificate-brand" x="81" y="40" width="148" height="43" viewBox="0 0 1280 370">${svgBody(full)}</svg>`;
const previousLogo = /<svg id="certificate-brand"[^>]*>[\s\S]*?<\/svg>|<text\b[^>]*>GDGoC<\/text>\s*<text\b[^>]*>AAST Aswan<\/text>/;
if (!previousLogo.test(certificate)) throw new Error('Could not locate the certificate brand artwork.');
await writeFile(certificateFile, certificate.replace(previousLogo, certificateLogo));

await copyFile(path.join(pack, 'README.md'), path.join(output, 'LOGO-PACK-README.md'));
await writeFile(path.join(output, 'sources.json'), `${JSON.stringify({
  source: 'GDGoC_LogoPack/GDGoC_AAST_Aswan_Logo_Pack',
  note: 'Supplied reconstructed logo kit; see LOGO-PACK-README.md. Original colors, paths, and proportions preserved.',
  files,
  derived: { 'gdgoc-favicon.svg': 'Icon_Four_Color.svg, centered on a square canvas', 'gdgoc-touch-icon.png': '05_Social_Avatars/Avatar_Icon_Light_1024.png', 'illustrations/season-certificate.svg': 'Full_Color_For_Light.svg embedded as vector paths' },
}, null, 2)}\n`);
console.log('Synced the supplied GDGoC logo pack: 8 SVG variants, favicon, touch icon, and certificate branding.');
