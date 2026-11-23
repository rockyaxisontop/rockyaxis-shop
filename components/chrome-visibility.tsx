"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Hides the site header, footer and page padding on full-screen app routes.
 *
 * `/message` is a messenger: on a phone the site header, search bar and footer
 * would eat most of the viewport and force scrolling. Rather than duplicating the
 * whole layout, we tag <html> with `app-shell` so CSS can remove that chrome and
 * let the chat fill the screen edge to edge.
 */
const APP_ROUTES = ["/message"];

export function ChromeVisibility() {
  const pathname = usePathname() ?? "";
  const isApp = APP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => {
    const root = document.documentElement;
    if (isApp) root.dataset.appShell = "true";
    else delete root.dataset.appShell;
    return () => {
      delete root.dataset.appShell;
    };
  }, [isApp]);

  if (!isApp) return null;

  // Rendered inside <head> is not allowed for client components, so the attribute
  // set above is the mechanism; this style block handles the instant first paint.
  return (
    <style>{`
      html[data-app-shell] [data-site-header],
      html[data-app-shell] [data-site-footer] {
        display: none !important;
      }
      html[data-app-shell] [data-main] {
        padding: 0 !important;
        max-width: none !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        display: flex !important;
      }
      html[data-app-shell],
      html[data-app-shell] body {
        overflow: hidden !important;
        height: 100%;
      }
    `}</style>
  );
}
