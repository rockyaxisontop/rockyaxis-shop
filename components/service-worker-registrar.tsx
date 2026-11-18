"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the site installable.
 *
 * Registration is skipped in development: a cached service worker fighting the
 * dev server's hot reload is confusing, and installability only matters in the
 * deployed build.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal: the site works without it.
      });
    };

    // Wait for load so the worker never competes with the first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
