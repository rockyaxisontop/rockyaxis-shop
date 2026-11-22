// TEMPORARY: seed a customer + admin with an order message, for flow testing.
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

export async function seed() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  const raw = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: raw.project_id,
        clientEmail: raw.client_email,
        privateKey: raw.private_key.replace(/\\n/g, "\n"),
      }),
    });
  const db = getFirestore(app);
  const auth = getAuth(app);

  const stamp = Date.now();
  const customerEmail = `ordercust.${stamp}@example.com`;
  const adminEmail = `orderadmin.${stamp}@example.com`;
  const password = "OrderTest!123";

  const customer = await auth.createUser({
    email: customerEmail,
    password,
    emailVerified: true,
    displayName: "Ramesh Thapa",
  });
  const admin = await auth.createUser({
    email: adminEmail,
    password,
    emailVerified: true,
    displayName: "Admin",
  });

  await db
    .collection("users")
    .doc(customer.uid)
    .set({ role: "user", fullName: "Ramesh Thapa", email: customerEmail, phoneNumber: "9812345678" });
  await db.collection("users").doc(admin.uid).set({ role: "admin", fullName: "Admin", email: adminEmail });

  await db.collection("carts").doc(customer.uid).collection("items").doc("row-1").set({
    productId: "demo-product-1",
    title: "Sony WH-1000XM5",
    brand: "Sony",
    price: 349,
    currency: "USD",
    quantity: 1,
    options: { Color: "Black" },
  });

  await db.collection("conversations").doc(customer.uid).set({
    customer: { uid: customer.uid, name: "Ramesh Thapa", email: customerEmail, phone: "9812345678" },
    lastMessageText: "",
    lastMessageAt: FieldValue.serverTimestamp(),
    lastSenderRole: "customer",
    lastMessageKind: "text",
    unreadForAdmin: 1,
    unreadForCustomer: 0,
    awaitingAdminReply: true,
    messageCount: 1,
    customerReadAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastActiveAt: FieldValue.serverTimestamp(),
  });

  const key = readFileSync("lib/firebase/config.ts", "utf8").match(/apiKey:\s*"([^"]+)"/)[1];
  const exchange = async (email) => {
    const user = await auth.getUserByEmail(email);
    const token = await auth.createCustomToken(user.uid);
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, returnSecureToken: true }),
      },
    );
    return (await res.json()).idToken;
  };

  const customerToken = await exchange(customerEmail);
  const adminToken = await exchange(adminEmail);

  const send = await fetch("http://localhost:3000/api/messages/order", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({}),
  });
  const sent = await send.json();

  return {
    customerUid: customer.uid,
    adminUid: admin.uid,
    customerEmail,
    adminEmail,
    password,
    reference: sent.message?.order?.reference ?? null,
    customerToken,
    adminToken,
  };
}
