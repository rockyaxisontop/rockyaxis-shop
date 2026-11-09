// QA: pull the reference site's accent colors and section styling.
export default async function run(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("https://gbnstore.com/", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => { });
  await page.waitForTimeout(4000);

  return page.evaluate(() => {
    const counts = new Map();
    for (const el of document.querySelectorAll("button, a, span, div")) {
      const s = getComputedStyle(el);
      for (const p of ["backgroundColor", "color"]) {
        const v = s[p];
        if (!v || v === "rgba(0, 0, 0, 0)" || v === "rgb(0, 0, 0)" || v === "rgb(255, 255, 255)") continue;
        const key = `${p}:${v}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);

    const h = (t) => Array.from(document.querySelectorAll("h1,h2,h3"))
      .find((el) => el.textContent.trim().toLowerCase().includes(t));
    const headStyle = (el) => el ? { size: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight } : null;

    // radial/linear gradient on section banners
    const grads = Array.from(document.querySelectorAll("div,section"))
      .map((el) => getComputedStyle(el).backgroundImage)
      .filter((b) => b && b.includes("gradient"))
      .slice(0, 5);

    return {
      topColors: top,
      categoriesHeading: headStyle(h("shop by categor")),
      dealsHeading: headStyle(h("deal")),
      gradients: [...new Set(grads)],
      radius: getComputedStyle(document.querySelector("main div") ?? document.body).borderRadius,
    };
  });
}
