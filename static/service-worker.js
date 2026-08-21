const CACHE='wtt-agri-intex-v2-visiting-card';
const APP_SHELL=['/','/add','/sync-status','/static/css/app.css','/static/js/i18n.js','/static/js/offline-queue.js','/static/js/common.js','/static/js/add-data.js','/static/js/sync-status.js','/static/images/logo.png','/static/images/images.png','/static/images/round.png','/static/images/whatsapp.png','/static/images/wttlogo.png','/manifest.webmanifest'];
self.addEventListener('install',event=>{ event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener('activate',event=>{ event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url); if (url.origin!==location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode==='navigate') {
    event.respondWith(fetch(event.request).then(r=>{ const c=r.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,c)); return r; }).catch(()=>caches.match(event.request).then(r=>r||caches.match('/')))); return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{ const c=r.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,c)); return r; })));
});
