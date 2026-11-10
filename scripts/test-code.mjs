// Calls GET /api/freebies/campaigns/:code with a real token and a real code.
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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

const raw = (env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ?? env.FIREBASE_ADMIN_SERVICE_ACCOUNT ?? "")
  .replace(/^['"]|['"]$/g, "");
const account = raw.startsWith("{")
  ? JSON.parse(raw)
  : {
    project_id: env.FIREBASE_ADMIN_PROJECT_ID,
    client_email: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    private_key: raw,
  };

const app = initializeApp(
  {
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key.replace(/\\n/g, "\n"),
    }),
  },
  "code-test",
);

const auth = getAuth(app);
const db = getFirestore(app);

const snap = await db.collection("freebieCampaigns").limit(1).get();
if (snap.empty) {
  console.log("No campaigns in Firestore — create one from the cart first.");
  process.exit(0);
}
const code = snap.docs[0].data().code;
console.log("Testing code:", code);

const user = await auth.createUser({
  email: `code-test-${Date.now()}@example.com`,
  password: "Test123456!",
  emailVerified: true,
});
const customToken = await auth.createCustomToken(user.uid);
const exchange = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCxXF9aR0-ycnMLAj4Q_ByL7iJoO9obMMY"}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  },
).then((r) => r.json());

const res = await fetch(`${base}/api/freebies/campaigns/${encodeURIComponent(code)}`, {
  headers: { Authorization: `Bearer ${exchange.idToken}` },
});
console.log("status:", res.status);
console.log("body:", (await res.text()).slice(0, 400));

await auth.deleteUser(user.uid).catch(() => { });
