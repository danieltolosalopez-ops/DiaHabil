// sw.js — permite instalar la web como app y usarla sin conexión.
const CACHE = 'diahabil-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'core.js', 'festivos.js', 'native.js', 'icon.svg', 'manifest.webmanifest',
  'fonts/bitter.woff', 'fonts/fira-400.woff', 'fonts/fira-600.woff', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Respuesta inmediata desde la caché y actualización en segundo plano (la próxima vez se ve la versión nueva).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const cached = await c.match(req, { ignoreSearch: true });
    const red = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || red;
  }));
});
