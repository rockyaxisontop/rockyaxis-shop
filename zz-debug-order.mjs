const key = (await import("node:fs")).readFileSync("lib/firebase/config.ts", "utf8").match(/apiKey:\s*"([^"]+)"/)[1];
const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const fs = await import("node:fs");
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const raw = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: raw.project_id, clientEmail: raw.client_email, privateKey: raw.private_key.replace(/\\n/g, "\n") }) });
const auth = getAuth(app);
const user = await auth.getUserByEmail("ordercust.1795340763056@example.com");
const t = await auth.createCustomToken(user.uid);
const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t, returnSecureToken: true }) });
const { idToken } = await r.json();
const res = await fetch("http://localhost:3000/api/messages/order", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` }, body: "{}" });
console.log(res.status, JSON.stringify(await res.json()).slice(0, 400));
