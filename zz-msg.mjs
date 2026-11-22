// temporary: verify the messaging API enforces auth and the pages render
export default async function run(page) {
  const out = {};

  // 1. Unauthenticated API access must be refused, never served.
  const probes = [
    ["GET", "/api/messages/conversation"],
    ["GET", "/api/messages/conversation/messages"],
    ["POST", "/api/messages/order"],
    ["POST", "/api/messages/read"],
    ["GET", "/api/admin/me"],
    ["GET", "/api/admin/conversations"],
    ["GET", "/api/admin/conversations/someuid/messages"],
    ["POST", "/api/admin/conversations/someuid/messages"],
    ["POST", "/api/messages/upload-url"],
  ];
  out.api = [];
  for (const [method, path] of probes) {
    const res = await fetch(`http://localhost:3000${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? "{}" : undefined,
    });
    const body = await res.json().catch(() => ({}));
    out.api.push({ path, method, status: res.status, error: body.error ?? null });
  }

  // 2. An invalid/forged bearer token must also be rejected.
  const forged = await fetch("http://localhost:3000/api/admin/me", {
    headers: { Authorization: "Bearer not-a-real-token" },
  });
  out.forgedToken = { status: forged.status };

  // 3. Pages render (they may redirect to login when signed out).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/message", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  out.messagePage = { url: page.url(), title: await page.title() };

  await page.goto("http://localhost:3000/adminhacker", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  out.adminPage = { url: page.url(), title: await page.title() };

  return out;
}
