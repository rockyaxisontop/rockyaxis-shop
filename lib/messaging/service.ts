import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { ApiError, getAdminDb, type AuthUser } from "@/lib/firebase/admin";

import type {
  AdminStats,
  Attachment,
  ConversationCustomer,
  MessageKind,
  OrderPayload,
  PublicConversation,
  PublicMessage,
} from "./types";

/**
 * Internal messenger — SERVER ONLY.
 *
 * Firestore rules deny all direct client access to these collections; every read
 * and write goes through /api/messages/* using the Admin SDK, which is what makes
 * unread counts, read receipts and "awaiting reply" flags trustworthy: a client
 * can never forge them.
 *
 * Collections:
 *   conversations/{uid}          one per customer, id === customer uid
 *   conversations/{uid}/messages/{messageId}
 *   admins/{uid}                 allow-list created from ADMIN_EMAILS
 */

const CONVERSATIONS = "conversations";
const ADMINS = "admins";
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
export const PAGE_SIZE = 30;

function db() {
  return getAdminDb();
}

/* -------------------------------------------------------------------------- */
/* Admin authorisation                                                        */
/* -------------------------------------------------------------------------- */

/** Emails allowed to be admins, from ADMIN_EMAILS (comma separated). */
function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolves whether the caller is an administrator.
 *
 * Two independent conditions must both hold:
 *  1. the verified token's email is in ADMIN_EMAILS (or ADMIN_EMAIL);
 *  2. an `admins/{uid}` document exists for that uid.
 *
 * Requiring the document means removing access is a single Firestore write and
 * takes effect immediately, without redeploying env vars.
 */
export async function resolveAdmin(user: AuthUser): Promise<boolean> {
  const email = user.email?.toLowerCase();
  if (!email) return false;
  if (!adminEmails().includes(email)) return false;
  const snapshot = await db().collection(ADMINS).doc(user.uid).get();
  return snapshot.exists && snapshot.data()?.role === "admin";
}

export async function requireAdmin(user: AuthUser): Promise<void> {
  if (!(await resolveAdmin(user))) {
    throw new ApiError("You don't have access to the admin panel.", 403);
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return null;
}

function toMessage(conversationId: string, id: string, data: FirebaseFirestore.DocumentData): PublicMessage {
  return {
    id,
    conversationId,
    senderId: data.senderId as string,
    senderRole: data.senderRole as "customer" | "admin",
    senderName: (data.senderName as string) ?? "",
    senderPhoto: (data.senderPhoto as string) ?? undefined,
    kind: (data.kind as MessageKind) ?? "text",
    text: (data.text as string) ?? "",
    attachment: (data.attachment as Attachment) ?? undefined,
    order: (data.order as OrderPayload) ?? undefined,
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
    deliveredAt: toIso(data.deliveredAt),
    readAt: toIso(data.readAt),
  };
}

function toConversation(id: string, data: FirebaseFirestore.DocumentData): PublicConversation {
  return {
    id,
    customer: data.customer as ConversationCustomer,
    lastMessage: {
      text: (data.lastMessageText as string) ?? "",
      at: toIso(data.lastMessageAt),
      senderRole: (data.lastSenderRole as "customer" | "admin") ?? "customer",
      kind: (data.lastMessageKind as MessageKind) ?? "text",
    },
    unreadForAdmin: (data.unreadForAdmin as number) ?? 0,
    unreadForCustomer: (data.unreadForCustomer as number) ?? 0,
    awaitingAdminReply: data.awaitingAdminReply === true,
    messageCount: (data.messageCount as number) ?? 0,
    adminReadAt: toIso(data.adminReadAt),
    customerReadAt: toIso(data.customerReadAt),
    updatedAt: toIso(data.updatedAt),
    lastActiveAt: toIso(data.lastActiveAt),
  };
}

function preview(kind: MessageKind, text: string) {
  if (kind === "order") return "Order details";
  if (kind === "image") return text ? `📷 ${text}` : "📷 Photo";
  if (kind === "video") return text ? `🎥 ${text}` : "🎥 Video";
  if (kind === "audio") return text ? `🎤 ${text}` : "🎤 Audio message";
  if (kind === "file") return text ? `📎 ${text}` : "📎 Attachment";
  return text.slice(0, 180);
}

/* -------------------------------------------------------------------------- */
/* Conversations                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Returns the caller's conversation with MT Store, creating it on first use.
 * The welcome message is a real message, so the customer always sees who they
 * are talking to and the thread is never empty.
 */
export async function getOrCreateMyConversation(user: AuthUser): Promise<PublicConversation> {
  const ref = db().collection(CONVERSATIONS).doc(user.uid);
  const existing = await ref.get();
  if (existing.exists) return toConversation(ref.id, existing.data()!);

  const profile = await db().collection("users").doc(user.uid).get();
  const profileData = profile.data() ?? {};
  const customer: ConversationCustomer = {
    uid: user.uid,
    name: profileData.fullName || user.email?.split("@")[0] || "Customer",
    email: user.email,
    phone: profileData.phoneNumber ?? undefined,
    photoURL: profileData.photoURL ?? undefined,
    address: [profileData.buildingStreet, profileData.locality, profileData.city]
      .filter(Boolean)
      .join(", "),
  };

  const now = FieldValue.serverTimestamp();
  await ref.set({
    customer,
    lastMessageText: "",
    lastMessageAt: now,
    lastSenderRole: "admin",
    lastMessageKind: "text",
    unreadForAdmin: 0,
    unreadForCustomer: 0,
    awaitingAdminReply: false,
    messageCount: 0,
    adminReadAt: null,
    customerReadAt: now,
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
  });

  await writeMessage(user.uid, {
    senderId: "mt-store",
    senderRole: "admin",
    senderName: "MT Store",
    senderPhoto: "/icon-192.png",
    kind: "text",
    text: "Hi! 👋 Welcome to MT Store. Send us your order or any question — our team replies here.",
  });

  const created = await ref.get();
  return toConversation(ref.id, created.data()!);
}

type MessageInput = {
  senderId: string;
  senderRole: "customer" | "admin";
  senderName: string;
  senderPhoto?: string;
  kind: MessageKind;
  text: string;
  attachment?: Attachment;
  order?: OrderPayload;
};

function buildMessage(input: MessageInput) {
  return {
    senderId: input.senderId,
    senderRole: input.senderRole,
    senderName: input.senderName,
    senderPhoto: input.senderPhoto ?? null,
    kind: input.kind,
    text: input.text.slice(0, 4000),
    attachment: input.attachment ?? null,
    order: input.order ?? null,
    deliveredAt: null,
    readAt: null,
  };
}

/** Appends a message and updates the conversation summary atomically. */
async function writeMessage(conversationUid: string, input: MessageInput) {
  const conversationRef = db().collection(CONVERSATIONS).doc(conversationUid);
  const messageRef = conversationRef.collection("messages").doc();
  const message = buildMessage(input);

  await db().runTransaction(async (tx) => {
    const summary = await tx.get(conversationRef);
    if (!summary.exists) throw new ApiError("Conversation not found.", 404);
    const data = summary.data()!;

    tx.set(messageRef, { ...message, createdAt: FieldValue.serverTimestamp() });

    // Unread counters are maintained here, never by the client, so they cannot
    // be manipulated and no message history has to be scanned to compute them.
    const fromCustomer = message.senderRole === "customer";
    tx.update(conversationRef, {
      lastMessageText: preview(message.kind, message.text),
      lastMessageAt: FieldValue.serverTimestamp(),
      lastSenderRole: message.senderRole,
      lastMessageKind: message.kind,
      messageCount: ((data.messageCount as number) ?? 0) + 1,
      unreadForAdmin: fromCustomer ? ((data.unreadForAdmin as number) ?? 0) + 1 : 0,
      unreadForCustomer: fromCustomer ? (data.unreadForCustomer as number) ?? 0 : ((data.unreadForCustomer as number) ?? 0) + 1,
      awaitingAdminReply: fromCustomer,
      lastActiveAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return messageRef.id;
}

/** Customer sends a message into their own conversation. */
export async function sendCustomerMessage(
  user: AuthUser,
  input: {
    kind: MessageKind;
    text?: string;
    attachment?: Attachment;
    order?: OrderPayload;
  },
): Promise<PublicMessage> {
  await getOrCreateMyConversation(user);
  const profile = await db().collection("users").doc(user.uid).get();
  const name = (profile.data()?.fullName as string) || user.email?.split("@")[0] || "Customer";

  const id = await writeMessage(user.uid, {
    senderId: user.uid,
    senderRole: "customer",
    senderName: name,
    senderPhoto: (profile.data()?.photoURL as string) ?? undefined,
    kind: input.kind,
    text: input.text ?? "",
    attachment: input.attachment,
    order: input.order,
  });

  const snapshot = await db().collection(CONVERSATIONS).doc(user.uid).collection("messages").doc(id).get();
  return toMessage(user.uid, id, snapshot.data()!);
}

/**
 * Sends an order message.
 *
 * `clientToken` (a hash of the cart contents) makes this idempotent: refreshing
 * /message or clicking Order Now twice reuses the same message instead of
 * posting duplicates.
 */
export async function sendOrderMessage(
  user: AuthUser,
  order: OrderPayload,
  clientToken: string,
): Promise<{ message: PublicMessage; duplicated: boolean }> {
  await getOrCreateMyConversation(user);
  const conversationRef = db().collection(CONVERSATIONS).doc(user.uid);
  const summary = await conversationRef.get();
  const existingToken = summary.data()?.lastOrderToken as string | undefined;

  if (existingToken && existingToken === clientToken) {
    const recent = await conversationRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    const last = recent.docs.find((doc) => doc.data().kind === "order" && doc.data().orderToken === clientToken);
    if (last) return { message: toMessage(user.uid, last.id, last.data()), duplicated: true };
  }

  const profile = await db().collection("users").doc(user.uid).get();
  const name = (profile.data()?.fullName as string) || user.email?.split("@")[0] || "Customer";

  const id = await writeMessage(user.uid, {
    senderId: user.uid,
    senderRole: "customer",
    senderName: name,
    senderPhoto: (profile.data()?.photoURL as string) ?? undefined,
    kind: "order",
    text: `New order · ${order.reference}`,
    order,
  });

  // Remember which cart produced this message so a refresh can't post it twice.
  await conversationRef
    .collection("messages")
    .doc(id)
    .update({ orderToken: clientToken });
  await conversationRef.update({ lastOrderToken: clientToken, lastOrderAt: FieldValue.serverTimestamp() });
  const snapshot = await conversationRef.collection("messages").doc(id).get();
  return { message: toMessage(user.uid, id, snapshot.data()!), duplicated: false };
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

/** Message history, newest first, for pagination with `before`. */
export async function listMessages(
  conversationUid: string,
  { before, limit = PAGE_SIZE }: { before?: string; limit?: number } = {},
): Promise<PublicMessage[]> {
  let query = db()
    .collection(CONVERSATIONS)
    .doc(conversationUid)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(Math.min(limit, 100));

  if (before) {
    const cursorDoc = await db()
      .collection(CONVERSATIONS)
      .doc(conversationUid)
      .collection("messages")
      .doc(before)
      .get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => toMessage(conversationUid, doc.id, doc.data()));
}

/** Marks the other side's messages as read/delivered and clears the counter. */
export async function markConversationRead(
  conversationUid: string,
  viewer: "customer" | "admin",
): Promise<void> {
  const dbRef = db();
  const conversationRef = dbRef.collection(CONVERSATIONS).doc(conversationUid);
  const messages = conversationRef.collection("messages");

  // Only the other side's messages need updating.
  const otherRole = viewer === "admin" ? "customer" : "admin";
  const unread = await messages.where("senderRole", "==", otherRole).orderBy("createdAt", "desc").limit(50).get();

  const batch = dbRef.batch();
  let changed = 0;
  for (const doc of unread.docs) {
    const data = doc.data();
    const patch: Record<string, unknown> = {};
    if (!data.deliveredAt) patch.deliveredAt = FieldValue.serverTimestamp();
    if (!data.readAt) patch.readAt = FieldValue.serverTimestamp();
    if (Object.keys(patch).length === 0) continue;
    batch.update(doc.ref, patch);
    changed++;
  }

  batch.update(conversationRef, {
    [viewer === "admin" ? "unreadForAdmin" : "unreadForCustomer"]: 0,
    [viewer === "admin" ? "adminReadAt" : "customerReadAt"]: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  void changed;
}

/** Customer's own conversation view. */
export async function getMyConversation(user: AuthUser): Promise<PublicConversation> {
  return getOrCreateMyConversation(user);
}

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export async function listAllConversations(): Promise<PublicConversation[]> {
  const snapshot = await db().collection(CONVERSATIONS).orderBy("lastMessageAt", "desc").limit(200).get();
  return snapshot.docs.map((doc) => toConversation(doc.id, doc.data()));
}

export async function getConversationForAdmin(uid: string): Promise<PublicConversation | null> {
  const snapshot = await db().collection(CONVERSATIONS).doc(uid).get();
  return snapshot.exists ? toConversation(uid, snapshot.data()!) : null;
}

/** Admin replies. Sending clears the "awaiting reply" flag immediately. */
export async function sendAdminMessage(
  admin: AuthUser,
  conversationUid: string,
  input: { kind: MessageKind; text?: string; attachment?: Attachment },
): Promise<PublicMessage> {
  const conversation = await db().collection(CONVERSATIONS).doc(conversationUid).get();
  if (!conversation.exists) throw new ApiError("Conversation not found.", 404);

  const id = await writeMessage(conversationUid, {
    senderId: admin.uid,
    senderRole: "admin",
    senderName: "MT Store",
    senderPhoto: "/icon-192.png",
    kind: input.kind,
    text: input.text ?? "",
    attachment: input.attachment,
  });

  const snapshot = await db().collection(CONVERSATIONS).doc(conversationUid).collection("messages").doc(id).get();
  return toMessage(conversationUid, id, snapshot.data()!);
}

/** Dashboard counters. Computed from the conversation documents, not messages. */
export async function getAdminStats(): Promise<AdminStats> {
  const snapshot = await db().collection(CONVERSATIONS).get();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const activeSince = Date.now() - ACTIVE_WINDOW_MS;

  let unread = 0;
  let awaitingReply = 0;
  let active = 0;
  let messages = 0;
  let today = 0;
  const customers = new Set<string>();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    customers.add(doc.id);
    unread += (data.unreadForAdmin as number) ?? 0;
    messages += (data.messageCount as number) ?? 0;
    if (data.awaitingAdminReply === true) awaitingReply++;
    const lastAt = data.lastMessageAt instanceof Timestamp ? data.lastMessageAt.toMillis() : 0;
    if (lastAt >= activeSince) active++;
    if (lastAt >= startOfDay.getTime()) today++;
  }

  return {
    conversations: snapshot.size,
    customers: customers.size,
    messages,
    unread,
    awaitingReply,
    active,
    today,
  };
}

/* -------------------------------------------------------------------------- */
/* Admin bootstrap                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Ensures the calling admin has an `admins/{uid}` document.
 *
 * Called from /api/admin/me after verifying the token's email is on the
 * allow-list, so a newly added admin doesn't need manual Firestore seeding.
 */
export async function ensureAdminDocument(user: AuthUser): Promise<void> {
  if (!user.email) throw new ApiError("Your account has no email address.", 403);
  if (!adminEmails().includes(user.email.toLowerCase())) {
    throw new ApiError("You don't have access to the admin panel.", 403);
  }
  await db().collection(ADMINS).doc(user.uid).set(
    {
      email: user.email.toLowerCase(),
      role: "admin",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
