// QA: screenshot a reference site at desktop + phone width.
export default async function run(page) {
  const url = process.env.QA_URL ?? "https://gbnstore.com/";
  const desktop = process.env.QA_OUT ?? "./ref-desktop.png";
  const phone = process.env.QA_OUT_MOBILE ?? "./ref-phone.png";

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => { });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: desktop });

  // key design tokens
  const tokens = await page.evaluate(() => {
    const pick = (sel, props) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return Object.fromEntries(props.map((p) => [p, s[p]]));
    };
    return {
      body: pick("body", ["backgroundColor", "color", "fontFamily"]),
      header: pick("header", ["backgroundColor"]),
    };
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: phone });

  return tokens;
}
