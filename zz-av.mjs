const EMAIL = "qa-av-1795344796333@example.com";
const PASSWORD = "QaAv!1234567";

export default async function run(page) {
  await page.setViewportSize({ width: 390, height: 844 });

  // Sign in through the app's own form so the SDK persists the session itself.
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);
  await page.locator('main input[type="email"]').fill(EMAIL);
  await page.locator('main input[type="password"]').fill(PASSWORD);
  await page.locator('main button[type="submit"]').click();
  await page.waitForTimeout(9000);

  const afterLogin = page.url();

  await page.goto("http://localhost:3000/message", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(9000);

  const detail = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("main img")).map((i) => ({
      src: i.getAttribute("src")?.slice(0, 32),
      w: Math.round(i.getBoundingClientRect().width),
      h: Math.round(i.getBoundingClientRect().height),
    }));
    return {
      images: imgs,
      text: (document.querySelector("main")?.innerText ?? "").replace(/\s+/g, " ").slice(0, 260),
    };
  });

  await page.screenshot({ path: "C:/Users/dcs/AppData/Local/Temp/avatar-chat.png" });
  return { afterLogin, url: page.url(), ...detail };
}
