import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const types = {
  '.html': 'text/html',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const target = path.resolve(
      root,
      '.' +
        decodeURIComponent(url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname),
    );
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const bytes = await readFile(target);
    res.writeHead(200, {
      'Content-Type':
        (types[path.extname(target)] || 'application/octet-stream') +
        (types[path.extname(target)]?.startsWith('text') ? '; charset=utf-8' : ''),
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    res.end(bytes);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(4173, '127.0.0.1', () => console.log('ClearVault: http://127.0.0.1:4173'));
