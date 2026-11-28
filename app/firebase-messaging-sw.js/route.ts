import { firebaseConfig } from "@/lib/firebase/config";

export const dynamic = "force-dynamic";

/**
 * Serves the FCM service worker with the project config injected.
 *
 * The worker has to be same-origin and needs the public Firebase config, so it is
 * generated here rather than hard-coded in /public — the config then lives in
 * exactly one place (`lib/firebase/config.ts`).
 */
export function GET() {
  // JSON.stringify + escaping `<` keeps the literal safe inside a JS file.
  const config = JSON.stringify(firebaseConfig).replace(/</g, "\\u003c");

  const body = `importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp(${config});

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (error) {
  // Older/unsupported browsers: fall through to the raw push handler below.
  console.warn("[sw] FCM init failed", error);
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function show(title, body, url, tag) {
  return self.registration.showNotification(title || "MT Store", {
    body: body || "",
    icon: "/mt-store-avatar-96.png",
    badge: "/favicon-32x32.png",
    tag: tag || undefined,
    renotify: Boolean(tag),
    data: { url: url || "/message" },
    vibrate: [80, 40, 80],
  });
}

// Shown when the tab is closed or in the background.
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    const d = payload.data || {};
    return show(n.title, n.body, d.url, d.tag);
  });
}

// Guaranteed path: a raw push always reaches the worker, even if the FCM
// helper failed to initialise. Without this, a closed browser can receive the
// push event and still show nothing.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const n = data.notification || data;
  const payload = data.data || data;
  event.waitUntil(show(n.title, n.body, payload.url, payload.tag));
});

// Focus an existing tab where possible, otherwise open a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || "/message", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.indexOf(self.location.origin) === 0) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

/* -------------------------------------------------------------------------- */
/* Caching + offline fallback                                                 */
/*                                                                            */
/* A browser allows only ONE service worker per scope. This file must own "/"  */
/* because FCM has to control it, so the caching behaviour that used to live   */
/* in public/sw.js lives here too. public/sw.js now imports this worker, so     */
/* either registration path ends up with a single worker doing both jobs.      */
/*                                                                            */
/* Never caches HTML or API responses: a stale price is worse than a slow page. */
/* -------------------------------------------------------------------------- */

const CACHE_VERSION = "mt-store-v2";
const STATIC_CACHE = CACHE_VERSION + "-static";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.indexOf(CACHE_VERSION) !== 0).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only GETs, and never cross-origin traffic.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, offline page as the fallback. Nothing cached.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }),
    );
    return;
  }

  // Build assets (hashed filenames): cache-first, refreshed in the background.
  // Written with indexOf + RegExp strings on purpose: this whole worker is a
  // template literal, and backslashes in a regex literal get eaten.
  const isAsset =
    url.pathname.indexOf("/_next/static/") === 0 ||
    new RegExp("[.](png|jpg|jpeg|webp|svg|woff2?|ico)$").test(url.pathname);
  if (!isAsset) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    }),
  );
});
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
