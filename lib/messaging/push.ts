import "server-only";

import { getMessaging } from "firebase-admin/messaging";

import { getAdminApp, getAdminDb } from "@/lib/firebase/admin";

import { listAdminUids } from "./service";

/**
 * Push notifications for the internal messenger.
 *
 * Device tokens live in `conversations/{uid}/deviceTokens/{token}` for customers
 * and in `users/{uid}/deviceTokens/{token}` for admins — both server-only, so a
 * client can register and remove only its own token through our API.
 *
 * Firestore already updates the open dashboard instantly; push exists for when
 * the tab is closed, which is why the payloads are small and carry a deep link.
 */

export type PushAudience =
  | { to: "customers"; uids: string[] }
  | { to: "admins" };

export type PushPayload = {
  title: string;
  body: string;
  /** Route to open when the notification is clicked. */
  url: string;
  /** Collapses repeats of the same conversation into one notification. */
  tag?: string;
};

function devicesCollection(uid: string, admins: boolean) {
  const db = getAdminDb();
  return admins
    ? db.collection("users").doc(uid).collection("deviceTokens")
    : db.collection("conversations").doc(uid).collection("deviceTokens");
}

/** Saves a web-push registration token for one user. */
export async function registerDeviceToken(
  uid: string,
  token: string,
  { admin = false, userAgent }: { admin?: boolean; userAgent?: string } = {},
) {
  if (!token || token.length < 40) throw new Error("Invalid device token.");
  await devicesCollection(uid, admin)
    .doc(token)
    .set(
      {
        token,
        platform: "web",
        userAgent: userAgent?.slice(0, 200) ?? null,
        updatedAt: new Date(),
      },
      { merge: true },
    );
}

export async function removeDeviceToken(uid: string, token: string, { admin = false } = {}) {
  await devicesCollection(uid, admin).doc(token).delete();
}

async function tokensFor(uids: string[], admin: boolean): Promise<string[]> {
  if (uids.length === 0) return [];
  const snapshots = await Promise.all(uids.map((uid) => devicesCollection(uid, admin).get()));
  const tokens = new Set<string>();
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) tokens.add(doc.id);
  }
  return [...tokens];
}

/**
 * Sends a push to the given audience.
 *
 * Failures are swallowed on purpose: a notification is a nice-to-have and must
 * never break sending a message. Tokens the FCM API rejects as unregistered are
 * deleted so the list cleans itself up.
 */
export async function sendPush(audience: PushAudience, payload: PushPayload): Promise<number> {
  try {
    const uids = audience.to === "admins" ? await listAdminUids() : audience.uids;
    const tokens = await tokensFor(uids, audience.to === "admins");
    if (tokens.length === 0) return 0;

    const response = await getMessaging(getAdminApp()).sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      webpush: {
        fcmOptions: { link: payload.url },
        notification: {
          icon: "/icon-192.png",
          badge: "/favicon-32x32.png",
          tag: payload.tag,
          renotify: true,
        },
      },
      data: { url: payload.url, tag: payload.tag ?? "" },
    });

    // Prune tokens that are permanently dead.
    const dead: string[] = [];
    response.responses.forEach((result, index) => {
      const code = result.error?.code ?? "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/invalid-argument"
      ) {
        dead.push(tokens[index]);
      }
    });

    if (dead.length > 0) {
      await Promise.all(
        uids.map(async (uid) => {
          const collection = devicesCollection(uid, audience.to === "admins");
          await Promise.all(dead.map((token) => collection.doc(token).delete().catch(() => { })));
        }),
      );
    }

    return response.successCount;
  } catch (error) {
    console.error("Push notification failed:", error);
    return 0;
  }
}

/** Notifies every admin that a customer wrote in. */
export function notifyAdminsOfCustomerMessage(input: {
  customerName: string;
  preview: string;
  conversationId: string;
  senderUid: string;
}) {
  return sendPush(
    { to: "admins" },
    {
      title: `New message from ${input.customerName}`,
      body: input.preview.slice(0, 140),
      url: `/adminhacker?c=${encodeURIComponent(input.conversationId)}`,
      tag: `conv-${input.conversationId}`,
    },
  );
}

/** Notifies a customer that MT Store replied. */
export function notifyCustomerOfAdminMessage(input: {
  customerUid: string;
  preview: string;
  conversationId: string;
}) {
  return sendPush(
    { to: "customers", uids: [input.customerUid] },
    {
      title: "MT Store replied",
      body: input.preview.slice(0, 140),
      url: "/message",
      tag: `conv-${input.conversationId}`,
    },
  );
}

/** Wording customers see for each order state. */
const ORDER_PUSH: Record<string, { title: string; body: string }> = {
  awaiting_payment: {
    title: "Order accepted — payment requested",
    body: "MT Store accepted your order. Tap to open the chat and complete payment.",
  },
  confirmed: {
    title: "Order success ✓",
    body: "Your payment is confirmed and MT Store is preparing your order.",
  },
  cancelled: {
    title: "Order cancelled",
    body: "This order was cancelled. Tap to see the details in your chat.",
  },
};

/**
 * Tells the customer their order moved on (accepted, successful, cancelled).
 *
 * The tag is per order reference, so repeated status changes replace the older
 * notification instead of stacking up in the tray.
 */
export async function notifyCustomerOfOrderStatus(input: {
  customerUid: string;
  reference: string;
  status: "awaiting_payment" | "confirmed" | "cancelled";
}): Promise<number> {
  const wording = ORDER_PUSH[input.status];
  if (!wording) return 0;
  return sendPush(
    { to: "customers", uids: [input.customerUid] },
    {
      title: wording.title,
      body: `Order ${input.reference} · ${wording.body}`.slice(0, 160),
      url: "/message",
      tag: `order-${input.reference}`,
    },
  );
}
