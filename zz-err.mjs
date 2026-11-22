const EMAIL = "qa-ui-1795342365940@example.com";
const PASSWORD = "QaUi!1234567";
const API_KEY = "AIzaSyCxXF9aR0-ycnMLAj4Q_ByL7iJoO9obMMY";

export default async function run(page) {
  const msgs = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") msgs.push(m.text().slice(0, 500));
  });
  page.on("pageerror", (e) => msgs.push("PAGEERROR: " + String(e).slice(0, 500)));

  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.evaluate(
    async ({ email, password, apiKey }) => {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
      );
      const d = await res.json();
      localStorage.setItem(
        `firebase:authUser:${apiKey}:[DEFAULT]`,
        JSON.stringify({
          uid: d.localId,
          email: d.email,
          emailVerified: true,
          displayName: "",
          isAnonymous: false,
          providerData: [],
          stsTokenManager: {
            refreshToken: d.refreshToken,
            accessToken: d.idToken,
            expirationTime: Date.now() + Number(d.expiresIn) * 1000,
          },
          createdAt: String(Date.now()),
          lastLoginAt: String(Date.now()),
          apiKey,
          appName: "[DEFAULT]",
        }),
      );
    },
    { email: EMAIL, password: PASSWORD, apiKey: API_KEY },
  );

  await page.goto("http://localhost:3000/checkout", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(9000);

  // Is the order-state module even loaded in this page's bundle?
  const loaded = await page.evaluate(() => ({
    nextScripts: Array.from(document.querySelectorAll("script[src]")).length,
    hasCartOrderChunk: performance
      .getEntriesByType("resource")
      .some((r) => r.name.includes("cart-order-status")),
  }));

  return { msgs: msgs.filter((m) => !/Failed to load resource/.test(m)), loaded };
}
