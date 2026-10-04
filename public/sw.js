const CACHE_NAME = 'price-pilot-v3';
const APP_SHELL = ['/', '/en', '/manifest.json', '/icon.svg', '/icon-maskable.svg', '/grid.svg'];

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

  const isCacheable = request.mode === 'navigate'
    || url.pathname.startsWith('/_next/static/')
    || /\.(?:js|css|svg|json|png|jpg|jpeg|webp)$/.test(url.pathname);

  // 汇率接口 (/api/) 等其他请求直接走网络, 不经过缓存。
  if (request.method !== 'GET' || url.origin !== self.location.origin || !isCacheable) {
    return;
  }

  // 有缓存就立即返回, 同时在后台更新缓存: 超市信号弱时打开应用不用等网络请求失败。
  // 代价是发布新版本后, 用户第二次打开才看到新版本。
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    const networkResponse = fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });

    if (cachedResponse) {
      // 离线时后台更新失败是正常情况, 页面已经用缓存显示了。
      event.waitUntil(networkResponse.catch(() => undefined));
      return cachedResponse;
    }

    try {
      return await networkResponse;
    } catch (error) {
      // 离线打开一个没缓存过的页面时, 退回缓存的首页。
      if (request.mode === 'navigate') {
        return cache.match('/');
      }

      throw error;
    }
  })());
});
