// Lists freebie campaigns in Firestore (no secrets printed).
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
  "inspect",
);

const db = getFirestore(app);
const snap = await db.collection("freebieCampaigns").get();

console.log(`campaigns: ${snap.size}`);
for (const doc of snap.docs) {
  const d = doc.data();
  console.log({
    id: doc.id,
    code: d.code,
    codeType: typeof d.code,
    codeLen: typeof d.code === "string" ? d.code.length : null,
    status: d.status,
    count: d.referralCount,
    owner: d.ownerUid?.slice(0, 8),
    productId: d.productId,
  });
}
