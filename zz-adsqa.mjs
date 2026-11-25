// temporary QA: confirm ad units render on landing pages and are absent in chat
export default async function run(page) {
  const out = {};
  await page.setViewportSize({ width: 390, height: 844 });

  const pages = ["/", "/freebie", "/message", "/search?q=headphones"];
  for (const path of pages) {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);
    out[path] = await page.evaluate(() => {
      const ads = Array.from(document.querySelectorAll('aside[aria-label="Advertisement"]'));
      const iframes = Array.from(document.querySelectorAll("iframe")).map((f) => f.src.slice(0, 70));
      const adScripts = Array.from(document.querySelectorAll("script[src]"))
        .map((s) => s.getAttribute("src"))
        .filter((s) => /bauval|abscloud|araplhn|highperformance/.test(s || ""));
      const native = document.querySelector('[id^="container-"]');
      return {
        adUnits: ads.length,
        labels: ads.map((a) => (a.innerText || "").split("\n")[0]).slice(0, 6),
        iframes,
        adScripts,
        nativeBox: native ? { id: native.id, h: native.getBoundingClientRect().height } : null,
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        mainHeight: document.querySelector("main")?.scrollHeight,
      };
    });
    await page.screenshot({ path: `C:/Users/dcs/AppData/Local/Temp/ads-${path.replace(/\W+/g, "_")}.png` });
  }
  return out;
}
