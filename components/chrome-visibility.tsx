"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { AD_POPUNDER_SCRIPT, AD_SOCIAL_BAR_SCRIPT, loadOnce } from "@/lib/ads";

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

  // The attribute set above is the mechanism; this style block handles the
  // instant first paint. GlobalAds stays mounted on every route so the script
  // loader state survives a trip through /message, but it never injects
  // anything while the messenger is open.
  return (
    <>
      {isApp ? <AdFreeStyles /> : null}
      <GlobalAds pathname={pathname} enabled={!isApp} />
    </>
  );
}

/**
 * Site-wide units: the social bar and popunder load once and stay loaded while
 * the visitor browses, so someone who lands on just one page still sees them.
 * They are skipped for the messenger, which must stay completely ad-free.
 */
function GlobalAds({ pathname, enabled }: { pathname: string; enabled: boolean }) {
  const loaded = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    // Load once per session, not on every navigation: re-running these scripts
    // would stack a social bar on top of the previous one.
    if (loaded.current) return;
    const isLanding = pathname.startsWith("/freebie") || pathname === "/" || pathname === "";
    const timer = window.setTimeout(
      () => {
        loaded.current = true;
        loadOnce(AD_SOCIAL_BAR_SCRIPT);
        loadOnce(AD_POPUNDER_SCRIPT);
      },
      // Landing pages get the units sooner — that may be the only page a
      // visitor ever sees.
      isLanding ? 1200 : 2500,
    );
    return () => window.clearTimeout(timer);
  }, [pathname, enabled]);

  return null;
}

function AdFreeStyles() {
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
