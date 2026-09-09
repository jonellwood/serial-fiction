import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

// Serve the actual compiled worker/assets with a small test navigation endpoint.
// This isolates offline-cache behavior from production database credentials.
const root = resolve('build');
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/' || pathname === '/private-chapter') {
    res.writeHead(200, {
      'content-type': 'text/html',
      'cache-control': 'private, no-store',
    });
    res.end(
      '<!doctype html><title>PWA fixture</title><p>Private response must not be cached.</p>',
    );
    return;
  }
  const file = resolve(root, '.' + pathname);
  if (!file.startsWith(root + '/')) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const content = await readFile(file);
    const type =
      {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json',
        '.webmanifest': 'application/manifest+json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
      }[extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(4175, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4175/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const manifest = await (
    await context.request.get('http://127.0.0.1:4175/manifest.webmanifest')
  ).json();
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons)
    assert.equal(
      (await context.request.get('http://127.0.0.1:4175' + icon.src)).status(),
      200,
    );
  await page.goto('http://127.0.0.1:4175/private-chapter');
  const paths = await page.evaluate(async () => {
    const paths = [];
    for (const name of await caches.keys())
      for (const req of await (await caches.open(name)).keys())
        paths.push(new URL(req.url).pathname);
    return paths;
  });
  assert.ok(paths.includes('/offline.html'));
  assert.ok(!paths.includes('/private-chapter'));
  assert.ok(!paths.includes('/'));
  await context.setOffline(true);
  await page.goto('http://127.0.0.1:4175/private-chapter');
  await page
    .getByRole('heading', { name: 'A little pause in the story.' })
    .waitFor();
  console.log(
    'PASS: compiled service worker installs, icons/manifest load, public assets cached, private HTML excluded, offline navigation shows fallback.',
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
