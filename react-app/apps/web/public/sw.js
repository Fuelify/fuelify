// Fuelify service worker: keeps the app's built files on the device so the
// installed app starts fast. Only immutable build assets and icons are cached
// (cache-first); pages, API calls and Supabase always go to the network, so
// data and sign-in are never stale.
const CACHE = 'fuelify-static-v1';
const STATIC = /^\/(_next\/static\/|icon|favicon|apple-touch-icon|brand\/|onboarding\/)/;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !STATIC.test(url.pathname)) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }),
  );
});
