/* Nómina Clara — Service Worker
   - Páginas: red primero, caché como fallback cuando no hay internet.
   - Recursos estáticos: caché primero, se actualizan en segundo plano.
   - No interfiere con Google Analytics, WhatsApp ni Apps Script. */

const VERSION = 'nc-v3';
const CORE = [
  './',
  'index.html',
  'aviso-legal.html',
  'privacidad.html',
  'cookies.html',
  'manifest.webmanifest',
  'favicon.svg',
  'favicon-32.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignora peticiones a otros dominios (GA, WhatsApp, etc.)
  if (url.origin !== self.location.origin) return;

  // Navegación: red primero, caché si falla
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('index.html'))
        )
    );
    return;
  }

  // Recursos estáticos: caché primero
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
