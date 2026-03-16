const CACHE_NAME = 'price-pilot-v1';
const APP_SHELL = ['/', '/manifest.json', '/icon.svg', '/icon-maskable.svg', '/grid.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      const response = await fetch(request);
      const shouldCache = request.mode === 'navigate'
        || url.pathname.startsWith('/_next/static/')
        || /\.(?:js|css|svg|json|png|jpg|jpeg|webp)$/.test(url.pathname);

      if (shouldCache && response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      if (request.mode === 'navigate') {
        return cache.match('/');
      }

      throw error;
    }
  })());
});
