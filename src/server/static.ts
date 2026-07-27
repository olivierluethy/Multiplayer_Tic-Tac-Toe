/**
 * Minimal static file server for the built client. Serves files from dist/ and
 * falls back to index.html so client-side room links (/?room=XXXX) resolve.
 * No dependency on express — the surface is tiny.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, extname, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

export function createStaticHandler(distDir: string) {
  const root = resolve(distDir);
  const indexHtml = join(root, 'index.html');
  const hasBuild = existsSync(indexHtml);

  return function serve(req: IncomingMessage, res: ServerResponse): void {
    if (!hasBuild) {
      res.writeHead(503, { 'content-type': 'text/plain' });
      res.end('Client build not found. Run `pnpm build`, or use `pnpm dev`.');
      return;
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    // Prevent path traversal: normalise and keep inside root.
    const relPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(root, relPath);
    if (!filePath.startsWith(root)) filePath = indexHtml;

    let target = filePath;
    if (!existsSync(target) || statSync(target).isDirectory()) {
      target = indexHtml; // SPA fallback
    }

    const ext = extname(target).toLowerCase();
    const type = MIME[ext] ?? 'application/octet-stream';
    // Hashed assets under /assets are safe to cache hard; index.html is not.
    const cache = target === indexHtml ? 'no-cache' : 'public, max-age=31536000, immutable';

    res.writeHead(200, { 'content-type': type, 'cache-control': cache });
    createReadStream(target)
      .on('error', () => {
        res.writeHead(500);
        res.end('Read error');
      })
      .pipe(res);
  };
}
