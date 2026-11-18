/*
 * MT Store service worker.
 *
 * Deliberately small and safe for a live shop:
 *  - it never caches HTML or API responses, so prices, stock and the cart are
 *    always fresh (a stale price is worse than a slow page);
 *  - it only caches static build assets, which are content-hashed by Next;
 *  - an offline page is shown when the network is genuinely unavailable.
 *
 * Bump CACHE_VERSION to invalidate old caches after a deploy.
 */
const CACHE_VERSION = "mt-store-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GETs, and never cross-origin API traffic.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, offline page as the fallback. Nothing is cached.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
    return;
  }

  // Build assets (hashed filenames): cache-first, refresh in the background.
  const isAsset = /^\/_next\/static\//.test(url.pathname) || /\.(png|jpg|jpeg|webp|svg|woff2?|ico)$/.test(url.pathname);
  if (!isAsset) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? network;
    }),
  );
});
