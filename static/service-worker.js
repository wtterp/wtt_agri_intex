const CACHE = 'wtt-exhibition-lead-v7';
const IS_LOCAL = self.location.hostname === '127.0.0.1' || self.location.hostname === 'localhost';
const ASSETS = [
  '/',
  '/add',
  '/sync-status',
  '/static/css/app.css',
  '/static/js/common.js',
  '/static/js/language.js',
  '/static/js/offline-queue.js',
  '/static/js/add-data.js',
  '/static/js/sync-status.js',
  '/static/images/logo.png'
];

self.addEventListener('install', event => {
  if (IS_LOCAL) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => IS_LOCAL || key !== CACHE).map(key => caches.delete(key)));

    if (IS_LOCAL) {
      // Remove an older development service worker that may still control localhost.
      await self.registration.unregister();
    }

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  // Never intercept localhost requests. Flask development must be real network only.
  if (IS_LOCAL) return;
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
