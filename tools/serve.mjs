/* Static server WITH HTTP Range support. python -m http.server has none, and
   a video cannot be seeked without it — which looks exactly like a broken
   scrub script. Production (Vercel) serves ranges fine; this matches it. */
import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 8900;
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.mp4':'video/mp4', '.webm':'video/webm', '.jpg':'image/jpeg', '.png':'image/png',
  '.svg':'image/svg+xml', '.webp':'image/webp', '.json':'application/json' };

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const path = join(ROOT, normalize(url === '/' ? '/index.html' : url));
  if (!existsSync(path) || statSync(path).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  const size = statSync(path).size;
  const type = TYPES[extname(path)] || 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': type,
    });
    return createReadStream(path, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Length': size, 'Content-Type': type, 'Accept-Ranges': 'bytes' });
  createReadStream(path).pipe(res);
}).listen(PORT, () => console.log('range-capable server on', PORT));
