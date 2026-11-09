// QA: screenshot a path at desktop and phone width.
export default async function run(page) {
  const base = process.env.QA_BASE ?? "http://localhost:3000";
  const path = process.env.QA_PATH ?? "/";
  const out = process.env.QA_OUT ?? "./qa";

  const results = [];
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["phone", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 }).catch(() => { });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${out}-${name}.png` });

    results.push(
      await page.evaluate((n) => ({
        size: n,
        scrollW: document.documentElement.scrollWidth,
        viewportW: window.innerWidth,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        h1: document.querySelector("h1")?.textContent?.trim().slice(0, 60) ?? null,
        headings: Array.from(document.querySelectorAll("h2")).map((h) => h.textContent.trim()),
      }), name),
    );
  }
  return results;
}
