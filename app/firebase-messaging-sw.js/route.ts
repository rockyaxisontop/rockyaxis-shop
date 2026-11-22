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

  const body = `importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js");

firebase.initializeApp(${config});
const messaging = firebase.messaging();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Shown when the tab is closed or in the background.
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const d = payload.data || {};
  self.registration.showNotification(n.title || "MT Store", {
    body: n.body || "",
    icon: "/icon-192.png",
    badge: "/favicon-32x32.png",
    tag: d.tag || undefined,
    renotify: Boolean(d.tag),
    data: { url: d.url || "/message" },
  });
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
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
