/* Disiplin PWA — offline-first service worker.
   Cache-first for static assets, network-first for navigations.
   Bump CACHE_VERSION when you want to invalidate.
*/
const CACHE_VERSION = 'disiplin-v1-2026-05-13';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== STATIC_CACHE && k !== RUNTIME_CACHE) return caches.delete(k);
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

// helper: network-first for navigations (HTML)
async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // offline fallback to index.html for SPA
    const fallback = await caches.match('/index.html');
    if (fallback) return fallback;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// cache-first for assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // stale-while-revalidate in background
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) caches.open(RUNTIME_CACHE).then((c) => c.put(request, res));
      })
      .catch(() => {});
    return cached;
  }
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // only handle same-origin
  if (url.origin !== self.location.origin) return;

  // navigations / HTML -> network-first
  const isNavigation =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    event.respondWith(networkFirst(request));
    return;
  }

  // vite assets, images, fonts, js, css -> cache-first
  const isAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/');

  if (isAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // default: try network, fallback cache
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) {
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(request).then((c) => c || caches.match('/index.html')))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
