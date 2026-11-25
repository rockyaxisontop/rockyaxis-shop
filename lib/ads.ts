/**
 * Adsterra placements.
 *
 * Every unit is opt-in: a slot only injects the network script when it is
 * actually mounted and (for native) when its container is about to be seen.
 * The chat route never mounts a slot, so /message stays ad-free.
 */

export const AD_BANNER_KEY = "d0bb8948cbf1e2a559877dec0ce69641";
export const AD_NATIVE_ID = "6e54bca8946b013c8a8406e6d3c8c6d1";
export const AD_SMARTLINK = "https://araplhn.org/4/931b790b0cd449cb6db648409c3daad4";

const BANNER_SRC = `https://bauval.org/22/${AD_BANNER_KEY}`;
const NATIVE_SRC = `https://bauval.org/21/${AD_NATIVE_ID}`;

declare global {
  interface Window {
    atOptions?: Record<string, unknown>;
    __adsLoaded?: { banner?: boolean; native?: boolean };
  }
}

let nativeLoading = false;

/**
 * Renders the 728x90 banner inside `host`.
 *
 * Adsterra's script reads `window.atOptions`, so the options object and the
 * script tag must land in the same document context — we create both here
 * rather than shipping an inline <script> in JSX.
 */
export function renderBanner728(host: HTMLElement) {
  if (typeof window === "undefined" || !host) return;

  window.atOptions = {
    key: AD_BANNER_KEY,
    format: "iframe",
    height: 90,
    width: 728,
    params: {},
  };

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  script.dataset.cfasync = "false";
  script.src = BANNER_SRC;
  host.appendChild(script);
}

/** Lazy-loads the native banner script once per page. */
export function loadNativeBanner() {
  if (typeof window === "undefined" || nativeLoading) return;
  nativeLoading = true;

  const script = document.createElement("script");
  script.async = true;
  script.setAttribute("fetchpriority", "high");
  script.dataset.cfasync = "false";
  script.src = NATIVE_SRC;
  document.body.appendChild(script);
}
