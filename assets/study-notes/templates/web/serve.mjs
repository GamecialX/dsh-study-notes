#!/usr/bin/env node
/**
 * Zero-dependency static file server for the study-notes learning portal.
 *
 * Used only when the launcher cannot find a Python interpreter. It serves the
 * notes root — the portal at `/web/index.html`, the Markdown notes beside it —
 * using nothing but Node's built-in modules, so it works with no network access
 * and no installed packages.
 *
 * Usage: node web/serve.mjs [port]
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Site root: the notes root, one level above this script's `web/` directory. */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Extension to content type. Unknown extensions are served as binary. */
const MIME = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
}));

const PORT = Number.parseInt(process.argv[2] ?? '8765', 10);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`端口无效：${process.argv[2]}`);
  process.exit(1);
}

/**
 * Map a request URL to an absolute file path inside the site root.
 *
 * @param rawUrl - The request target.
 * @returns The absolute path, or `undefined` when it escapes the root.
 */
function toFilePath(rawUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname);
  } catch {
    return undefined;
  }
  const relative = normalize(pathname).replace(/^([/\\])+/u, '');
  const absolute = resolve(join(ROOT, relative));
  if (absolute !== ROOT && !absolute.startsWith(ROOT + sep)) return undefined;
  return absolute;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, '405 Method Not Allowed', { allow: 'GET, HEAD' });
    return;
  }

  const requested = toFilePath(req.url ?? '/');
  if (requested === undefined) {
    send(res, 403, '403 Forbidden');
    return;
  }

  let target = requested;
  try {
    let info = await stat(target);
    if (info.isDirectory()) {
      target = join(target, 'index.html');
      info = await stat(target);
    }
    if (!info.isFile()) throw new Error('not a file');
    const type = MIME.get(extname(target).toLowerCase()) ?? 'application/octet-stream';
    res.writeHead(200, {
      'content-type': type,
      'content-length': info.size,
      'cache-control': 'no-cache',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = createReadStream(target);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch {
    send(res, 404, `404 Not Found\n\n${req.url}`);
  }
});

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用。请换一个端口，例如：node web/serve.mjs ${PORT + 1}`);
  } else {
    console.error(`服务器启动失败：${error?.message ?? error}`);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`笔记服务器已启动：http://localhost:${PORT}/web/index.html`);
  console.log(`站点根目录：${ROOT}`);
  console.log('按 Ctrl+C 停止。');
});
