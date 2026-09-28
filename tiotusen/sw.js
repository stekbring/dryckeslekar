/* TioTusen – service worker: gör att spelet fungerar utan internet.
   Själva sidan (index.html) hämtas alltid färsk när det finns internet, så en ny version
   du laddar upp syns direkt. Övriga filer sparas i en cache. Ändra VERSION om du byter
   ut three.min.js eller ikonerna. Ikonerna i mappen ikoner/ sparas först när de används. */
const VERSION = 'tiotusen-4';
const FILES = ['./', './index.html', './three.min.js', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('.apk')) return;                       // APK-filen hämtas alltid direkt
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (url.origin === location.origin && isPage) {                  // sidan: nätet först, cachen om du är offline
    e.respondWith(fetch(req).then(res => put(req, res))
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => put(req, res))));   // övrigt: cachen först
});
