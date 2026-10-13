// Adapted from FitnessIcon's static server; isolated loopback port and public allowlist.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const initialPort = Number(process.env.PORT || 3077);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.yml': 'text/yaml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end('Local frontend preview: submissions are not enabled.'); }
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (path === '/cms' || path === '/cms/help' || path === '/blog' || /^\/blog\/[a-z0-9-]+$/i.test(path)) {
    res.writeHead(308, { Location: path + '/' });
    return res.end();
  }
  if (path === '/blog/') path = '/blog/index.html';
  else if (/^\/blog\/[a-z0-9-]+\/$/i.test(path)) path += 'index.html';
  else if (path === '/cms/') path = '/cms-starter/admin/index.html';
  else if (path === '/cms/help/') path = '/cms-starter/admin/help/index.html';
  else if (/^\/cms\/(config\.yml|preview\.(?:js|css)|workspace\.css)$/.test(path)) path = '/cms-starter/admin/' + path.slice(5);
  const allowed = path === '/' || path === '/index.html' || path === '/output.css' || ['/robots.txt', '/sitemap.xml', '/llms.txt'].includes(path) || /^\/(assets|js|blog)\/[a-zA-Z0-9_./-]+$/.test(path) || /^\/cms-starter\/admin\/(?:index\.html|config\.yml|preview\.(?:js|css)|workspace\.css|help\/index\.html)$/.test(path);
  const target = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  if (!allowed || !target.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(404); return res.end('Not found'); }
  try {
    const bytes = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
});
let port = initialPort;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < initialPort + 20) {
    console.log(`Port ${port} is occupied; leaving it untouched.`);
    server.listen(++port, '127.0.0.1');
  } else { console.error(error.message); process.exit(1); }
});
server.listen(port, '127.0.0.1', () => console.log(`The Aptitude Academy preview: http://localhost:${server.address().port}`));
