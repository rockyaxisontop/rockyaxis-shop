// Verifies a referral link works WITHOUT a token (signed-out visitor).
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
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
  "public-test",
);

const db = getFirestore(app);
const snap = await db.collection("freebieCampaigns").limit(1).get();
if (snap.empty) {
  console.log("No campaigns to test.");
  process.exit(0);
}

const code = snap.docs[0].data().code;
console.log("code:", code);

// 1. No Authorization header at all.
const anon = await fetch(`${base}/api/freebies/campaigns/${encodeURIComponent(code)}`);
const anonBody = await anon.json().catch(() => ({}));
console.log("signed-out status:", anon.status);
console.log("signed-out has product:", Boolean(anonBody.campaign?.product?.title));
console.log("signed-out isOwner:", anonBody.campaign?.isOwner);

// 2. Bogus code should still 404.
const bad = await fetch(`${base}/api/freebies/campaigns/definitely-not-a-code`);
console.log("bad code status:", bad.status);

// 3. The page itself should render (not the error state).
const page = await fetch(`${base}/freebie/${encodeURIComponent(code)}`);
console.log("page status:", page.status);

process.exit(anon.status === 200 && anonBody.campaign?.product?.title ? 0 : 1);
