/**
 * Ad network configuration — single source of truth.
 *
 * Every unit comes from one Adsterra account:
 *   728x90 banner, native banner, smartlink, social bar and popunder.
 *
 * Rules that keep the site usable (and keep the account healthy):
 *  - ONE 728x90 iframe per page (the iframe script writes into the global
 *    `atOptions`, so two of them on a page would fight over it).
 *  - The native banner script is loaded once; extra native placements just
 *    repeat its container div (the network fills every container it finds).
 *  - The social bar + popunder are global "page" units: they load once and
 *    travel with the visitor across route changes.
 *  - The smartlink is NEVER injected as an automatic redirect. It is only
 *    offered as a clearly-labelled link/button, which keeps us clear of
 *    malicious-software / unwanted-redirect policies.
 *  - Nothing renders on /message (see ChromeVisibility + ad-slot).
 */

export const AD_728_KEY = "d0bb8948cbf1e2a559877dec0ce69641";
export const AD_728_SCRIPT = `https://bauval.org/22/${AD_728_KEY}`;

export const AD_NATIVE_ID = "6e54bca8946b013c8a8406e6d3c8c6d1";
export const AD_NATIVE_SCRIPT = `https://bauval.org/21/${AD_NATIVE_ID}`;

export const AD_SOCIAL_BAR_SCRIPT = "https://bauval.org/14/a548dac3bb7f40db152df20cca2ccdf3";
export const AD_POPUNDER_SCRIPT = "https://abscloud.org/1/5300c55c0f88310b2a8344d319380e22";

export const AD_SMARTLINK = "https://araplhn.org/4/931b790b0cd449cb6db648409c3daad4";

/**
 * Injects the 728x90 iframe banner into `host`.
 *
 * The network script reads `atOptions` from `window` at run time, so the
 * options object has to be set on the window before the script executes and
 * the script itself must live in the *same* document. We therefore build a
 * sandboxed iframe, write the whole snippet into it and never touch the
 * parent page's globals. Also keeps the ad's styles out of our layout.
 */
export function renderBanner728(host: HTMLElement): void {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>atOptions=${JSON.stringify(
    { key: AD_728_KEY, format: "iframe", height: 90, width: 728, params: {} },
  )};</script><script data-cfasync="false" src="${AD_728_SCRIPT}"></script></body></html>`;

  const frame = document.createElement("iframe");
  frame.title = "Advertisement";
  frame.width = "728";
  frame.height = "90";
  frame.scrolling = "no";
  frame.frameBorder = "0";
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
  frame.setAttribute("loading", "lazy");
  frame.style.cssText = "border:0;width:728px;height:90px;max-width:100%;display:block;margin:0 auto";
  frame.srcdoc = doc;
  host.appendChild(frame);
}

/** Loads the native banner script one time per page. */
export function loadNativeBanner(): void {
  if (document.querySelector(`script[src="${AD_NATIVE_SCRIPT}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.setAttribute("fetchpriority", "high");
  script.setAttribute("data-cfasync", "false");
  script.src = AD_NATIVE_SCRIPT;
  document.body.appendChild(script);
}

/** Loads a global page-level script one time per page. */
export function loadOnce(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.setAttribute("data-cfasync", "false");
  script.src = src;
  document.body.appendChild(script);
}
