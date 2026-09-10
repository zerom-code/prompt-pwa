const CACHE = 'forma-shell-v2';
const SCOPE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const asset = path => `${SCOPE}${path}`;
const FILES = [asset('/'), asset('/offline.html'), asset('/icon.svg'), asset('/icons/icon-192.png'), asset('/icons/icon-512.png'), asset('/images/mountains.svg'), asset('/images/product.svg'), asset('/images/portrait.svg')];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('forma-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_URLS' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(event.data.urls.map(url => {
    const target = new URL(url, self.location.origin);
    if (target.origin !== self.location.origin) return undefined;
    return cache.add(target.href).catch(() => undefined);
  }))).then(() => event.source?.postMessage({ type: 'FORMA_OFFLINE_READY' })));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.searchParams.has('_rsc')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { if (response.ok && url.pathname === asset('/')) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(asset('/'), copy)); } return response; }).catch(async () => (await caches.match(asset('/'))) || (await caches.match(asset('/offline.html')))));
    return;
  }
  if (url.pathname.startsWith(asset('/_next/static/')) || FILES.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); } return response; })));
  }
});
