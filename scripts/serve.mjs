import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.argv.includes('--dist');
const root = dist ? path.join(project, 'dist') : project;
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 3100);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };

if (dist) await stat(path.join(root, 'index.html')).catch(() => { throw new Error('Run npm run build before npm run preview.'); });

const server = createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const pathname = requestPath === '/' ? '/index.html' : requestPath;
    // The public directory is served at the root, as it would be in a bundled app.
    const relative = !dist && pathname.startsWith('/assets/') ? `public${pathname}` : pathname.slice(1);
    const file = path.resolve(root, relative);
    const fromRoot = path.relative(root, file);
    const allowed = ['index.html', 'assets-gallery.html', 'src', 'assets', 'public', 'screenshots', 'design', 'docs'];
    if (fromRoot.startsWith('..') || path.isAbsolute(fromRoot) || !allowed.includes(fromRoot.split(path.sep)[0])) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(data);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('This page could not be found.');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`GDGoC Learn is ready at http://127.0.0.1:${port}${dist ? ' (production preview)' : ''}`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try npm start -- --port ${port + 1}` : error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
