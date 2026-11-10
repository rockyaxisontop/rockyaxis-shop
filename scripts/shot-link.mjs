// Screenshots a referral link page at phone width.
export default async function run(page) {
  const url = process.env.QA_URL;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => { });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: process.env.QA_OUT ?? "./link.png", fullPage: true });
  return page.evaluate(() => ({
    text: document.body.innerText.slice(0, 300),
    hasInvalid: document.body.innerText.includes("isn't valid"),
  }));
}
