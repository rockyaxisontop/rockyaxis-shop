/**
 * Exercises the real HTTP API with a real Firebase ID token.
 * Creates a throwaway user, mints a token, calls each route, reports status.
 *
 *   node scripts/test-api.mjs [baseUrl]
 */
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const base = process.argv[2] ?? "http://localhost:3000";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const raw = (env.FIREBASE_ADMIN_SERVICE_ACCOUNT ?? "").replace(/^['"]|['"]$/g, "");
const app = initializeApp(
  {
    credential: cert({
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: raw.replace(/\\n/g, "\n"),
    }),
  },
  "api-test",
);

const auth = getAuth(app);
const user = await auth.createUser({
  email: `api-test-${Date.now()}@example.com`,
  password: "Test123456!",
  emailVerified: true,
});

// Custom token → exchange for an ID token via the REST API (no client SDK needed).
const customToken = await auth.createCustomToken(user.uid);
const exchange = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCxXF9aR0-ycnMLAj4Q_ByL7iJoO9obMMY"}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  },
).then((r) => r.json());

if (!exchange.idToken) {
  console.log("Could not mint ID token:", JSON.stringify(exchange).slice(0, 300));
  await auth.deleteUser(user.uid);
  process.exit(1);
}

const idToken = exchange.idToken;
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };

async function hit(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text.slice(0, 200);
  }
  console.log(`${res.status}  ${method} ${path}`);
  if (res.status >= 400) console.log("   →", JSON.stringify(parsed).slice(0, 300));
  return { status: res.status, body: parsed };
}

const results = [];
results.push(await hit("GET", "/api/freebies/campaigns"));
results.push(await hit("POST", "/api/freebies/campaigns", { productId: "test-product" }));
results.push(await hit("GET", "/api/freebies/orders"));

await auth.deleteUser(user.uid).catch(() => { });

const bad = results.filter((r) => r.status >= 500);
console.log(bad.length ? `\n${bad.length} route(s) returned 5xx` : "\nNo 5xx responses");
process.exit(bad.length ? 1 : 0);
