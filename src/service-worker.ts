/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';
const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = `between-lines-${version}`;
const assets = [...build, ...files];
worker.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});
worker.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith('between-lines-') && key !== cacheName)
          await caches.delete(key);
      await worker.clients.claim();
    })(),
  );
});
worker.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== worker.location.origin) return;
  if (assets.includes(url.pathname))
    event.respondWith(
      caches
        .open(cacheName)
        .then(
          async (cache) =>
            (await cache.match(url.pathname)) ?? fetch(event.request),
        ),
    );
  else if (event.request.mode === 'navigate')
    event.respondWith(
      fetch(event.request).catch(
        async () => (await caches.match('/offline.html'))!,
      ),
    );
  // Never cache server responses, chapter HTML, authentication, or private data.
});
