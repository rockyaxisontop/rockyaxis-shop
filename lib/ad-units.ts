/**
 * Format helpers for ads that run on multiple pages.
 *
 * Social bar + in-page push + popunder already work everywhere via
 * `ChromeVisibility` (which skips /message). This module is the client-side
 * loader for those units so they can be timed independently of React re-renders
 * and so the network's own eligibility rules (referrer, geo, frequency) decide
 * whether to show them — we never invent a container or fake a click.
 */

/**
 * Adsterra units that are verified to exist for this account.
 *
 * IMPORTANT: there is no in-page-push unit for these keys. The Adsterra path
 * `/inpage.js` exists as a URL pattern but `<key>/inpage.js` 301-redirects to
 * google.com for the keys used here — injecting it would silently load nothing.
 * In-page push must be created in the Adsterra dashboard first; its key then
 * goes in `AD_IN_PAGE_PUSH_SRC` below and it will start working here with no
 * further code change.
 */

/** Social bar (verified: 200, real script). Displayed on every page but /message. */
export const AD_SOCIAL_BAR_SRC =
  "https://www.highperformanceformat.com/e76ad1e8a3f3403f8acb8df4a2bb8da0/invoke.js";

/**
 * In-page push. Set this to the real `<key>/inpage.js` URL from your Adsterra
 * dashboard to switch the unit on. While it is empty nothing is injected, so the
 * site never requests a URL that just redirects away.
 */
export const AD_IN_PAGE_PUSH_SRC: string = "";

/**
 * Inject one third-party network script, once per page load.
 *
 * The script looks up its own `<script>` element via `document.currentScript`
 * and inserts its markup next to it, so we must append it to `document.body`
 * as a real tag rather than evaluating fetched text. Duplicates are skipped to
 * prevent a double social bar after client-side navigation.
 */
export function loadNetworkScript(src: string, key: string): void {
  if (typeof document === "undefined" || !src) return;
  if (document.querySelector(`script[data-unit="${key}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.dataset.cfasync = "false";
  script.dataset.unit = key;
  script.src = src;
  document.body.appendChild(script);
}

/**
 * Unwinds any network markup a just-left route injected.
 *
 * `ChromeVisibility` guards against loading the units twice, but nothing
 * removes the *previous* page's social bar when navigating to /message — the
 * messenger must be completely ad-free. This strips what the units leave
 * behind (their fixed containers and stray iframes) without touching the app.
 */
export function clearNetworkAdMarkup(): void {
  if (typeof document === "undefined") return;

  const selectors = [
    // Adsterra social bar / in-page push wrappers.
    "[id^='hs-']",
    "[id^='adsterra']",
    "[class*='adsterra']",
    // Our own unit markers (scripts only — never page content).
    "script[data-unit]",
  ];

  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((node) => node.remove());
  }

  // Remove any top-level ad iframe the network appended to <body>.
  document.querySelectorAll("body > iframe").forEach((frame) => {
    const src = frame.getAttribute("src") ?? "";
    if (/highperformanceformat|araplhn|bauval|adsterra/i.test(src) || src === "") {
      frame.remove();
    }
  });
}
