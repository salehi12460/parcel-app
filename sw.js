/* Parcel App PWA service worker - v8
   Network-first for the app shell so GitHub Pages never stays on an old index.html.
   External APIs (including Google Apps Script) are never cached by this worker.
*/
const CACHE_NAME = 'parcel-app-v8';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Never interfere with Google Apps Script, CDNs, or other cross-origin requests.
  if (url.origin !== self.location.origin) return;
  if (req.method !== 'GET') return;

  // Navigation and HTML: always try the network first, then fall back to cache.
  if (req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match(req)))
    );
    return;
  }

  // Other same-origin app assets: cache first with network update fallback.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
