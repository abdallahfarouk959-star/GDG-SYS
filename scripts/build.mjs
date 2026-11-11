import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(project, 'dist');
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'src', 'design', 'docs', 'screenshots']) await cp(path.join(project, name), path.join(output, name), { recursive: true });
await cp(path.join(project, 'public', 'assets'), path.join(output, 'assets'), { recursive: true });
const gallery = await readFile(path.join(project, 'assets-gallery.html'), 'utf8');
await writeFile(path.join(output, 'assets-gallery.html'), gallery.replaceAll('public/assets/', 'assets/'));
console.log('Built dist/ with Material Web, all learning screens, editable assets, and the asset gallery.');
console.log('Material Web and Google Sans load from their CDNs. Material Symbols SVGs are included locally.');
