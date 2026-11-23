import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { ApiError, getAdminDb, type AuthUser } from "@/lib/firebase/admin";

import { recordOrder, getOrder } from "./orders";

import type {
  AdminStats,
  Attachment,
  ChatOrderStatus,
  ConversationCustomer,
  MessageKind,
  OrderPayload,
  PublicConversation,
  PublicMessage,
  ReplyPreview,
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
 *   conversations/{uid}/deviceTokens/{token}   push targets for that customer
 *   users/{uid}.role             "admin" grants the admin panel (DB-driven)
 */

const CONVERSATIONS = "conversations";
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
export const PAGE_SIZE = 30;

function db() {
  return getAdminDb();
}

/* -------------------------------------------------------------------------- */
/* Admin authorisation                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Whether a users/{uid} profile grants admin rights.
 *
 * The ONLY admin signal is `role == "admin"` on the user document. There is no
 * environment-variable allow-list: access is granted and revoked by writing to
 * Firestore, and the rules below stop a user from promoting themselves.
 */
function profileIsAdmin(data: FirebaseFirestore.DocumentData | undefined) {
  if (!data) return false;
  const role = String(data.role ?? "").toLowerCase();
  // "admin" and legacy "ADMIN"/"Admin" all count; "user"/"customer" never do.
  return role === "admin" && data.disabled !== true;
}

/**
 * Resolves whether the caller is an administrator, from the database.
 *
 * Read on every privileged request (not cached in a token), so demoting someone
 * takes effect immediately rather than after their ID token expires.
 */
export async function resolveAdmin(user: AuthUser): Promise<boolean> {
  const snapshot = await db().collection("users").doc(user.uid).get();
  return profileIsAdmin(snapshot.data());
}

export async function requireAdmin(user: AuthUser): Promise<void> {
  if (!(await resolveAdmin(user))) {
    throw new ApiError("You don't have access to the admin panel.", 403);
  }
}

/** Uids of every administrator, used to fan out admin push notifications. */
export async function listAdminUids(): Promise<string[]> {
  const snapshot = await db().collection("users").where("role", "==", "admin").limit(50).get();
  return snapshot.docs
    .filter((doc) => doc.data().disabled !== true)
    .map((doc) => doc.id);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  // A ServerTimestamp sentinel that hasn't been resolved yet reads back as
  // neither — treat it as "not set" rather than throwing.
  return null;
}

/** Removes `undefined` keys: Firestore throws on them instead of skipping. */
function stripUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
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
    replyTo: (data.replyTo as ReplyPreview) ?? undefined,
    clientId: (data.clientId as string) ?? undefined,
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

  // Firestore rejects `undefined`, so every optional field is coerced to null
  // or omitted. A new customer has no saved phone/photo/address.
  const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
  const customer: ConversationCustomer = {
    uid: user.uid,
    name: str(profileData.fullName) ?? str(user.email?.split("@")[0]) ?? "Customer",
    email: str(user.email),
    phone: str(profileData.phoneNumber),
    photoURL: str(profileData.photoURL),
    address:
      [profileData.buildingStreet, profileData.locality, profileData.city]
        .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
        .join(", ") || undefined,
  };

  const now = FieldValue.serverTimestamp();
  const welcome =
    "Hi! 👋 Welcome to MT Store. Send us your order or any question — our team replies here.";
  const messageRef = ref.collection("messages").doc();

  // One atomic write: the summary AND the welcome message, so the thread is
  // never left half-created (a second transaction here could 404 on a race).
  const batch = db().batch();
  batch.set(ref, {
    customer: stripUndefined(customer),
    lastMessageText: welcome,
    lastMessageAt: now,
    lastSenderRole: "admin",
    lastMessageKind: "text",
    unreadForAdmin: 0,
    unreadForCustomer: 1,
    awaitingAdminReply: false,
    messageCount: 1,
    adminReadAt: null,
    customerReadAt: now,
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
  });
  batch.set(messageRef, {
    ...buildMessage({
      senderId: "mt-store",
      senderRole: "admin",
      senderName: "MT Store",
      senderPhoto: "/icon-192.png",
      kind: "text",
      text: welcome,
    }),
    createdAt: now,
    deliveredAt: null,
    readAt: null,
  });
  await batch.commit();

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
  replyTo?: ReplyPreview;
  clientId?: string;
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
    // Orders come from the cart and may have optional fields missing (no image,
    // no link, no options). Firestore rejects `undefined`, so deep-clean here.
    order: input.order ? (stripDeep(input.order) as OrderPayload) : null,
    replyTo: input.replyTo ? stripUndefined(input.replyTo) : null,
    clientId: input.clientId ?? null,
    deliveredAt: null,
    readAt: null,
  };
}

/** Recursively removes `undefined` values — Firestore rejects them anywhere. */
function stripDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripDeep(item)) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripDeep(item)]),
    ) as T;
  }
  return value;
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
    tx.set(
      conversationRef,
      {
        lastMessageText: preview(message.kind, message.text),
        lastMessageAt: FieldValue.serverTimestamp(),
        lastSenderRole: message.senderRole,
        lastMessageKind: message.kind,
        messageCount: ((data.messageCount as number) ?? 0) + 1,
        unreadForAdmin: fromCustomer ? ((data.unreadForAdmin as number) ?? 0) + 1 : 0,
        unreadForCustomer: fromCustomer
          ? ((data.unreadForCustomer as number) ?? 0)
          : ((data.unreadForCustomer as number) ?? 0) + 1,
        awaitingAdminReply: fromCustomer,
        lastActiveAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
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
    replyTo?: ReplyPreview;
    clientId?: string;
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
    replyTo: input.replyTo,
    clientId: input.clientId,
  });

  const snapshot = await db().collection(CONVERSATIONS).doc(user.uid).collection("messages").doc(id).get();
  const saved = snapshot.data()!;

  // Push is fire-and-forget: a delivery failure must never fail the message.
  void import("./push")
    .then(({ notifyAdminsOfCustomerMessage }) =>
      notifyAdminsOfCustomerMessage({
        customerName: name,
        preview: preview(input.kind, input.text ?? ""),
        conversationId: user.uid,
        senderUid: user.uid,
      }),
    )
    .catch(() => {});

  return toMessage(user.uid, id, saved);
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

  // Track the order's lifecycle so both sides can see its status.
  await recordOrder({
    reference: order.reference,
    customerUid: user.uid,
    currency: order.currency,
    total: Object.values(order.totals)[0] ?? 0,
    itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    lineIds: order.lines.map((line) => `${line.productId}|${JSON.stringify(line.options ?? {})}`),
  }).catch(() => {});
  const snapshot = await conversationRef.collection("messages").doc(id).get();

  // An order is the alert admins most need to see, even with the tab closed.
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  void import("./push")
    .then(({ notifyAdminsOfCustomerMessage }) =>
      notifyAdminsOfCustomerMessage({
        customerName: name,
        preview: `🛒 New order ${order.reference} · ${itemCount} item${itemCount === 1 ? "" : "s"}`,
        conversationId: user.uid,
        senderUid: user.uid,
      }),
    )
    .catch(() => {});

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

  // Only the other side's messages need updating. Newest first, and filtered
  // in code — a single-field query needs no composite index to be deployed.
  const otherRole = viewer === "admin" ? "customer" : "admin";
  const recent = await messages.orderBy("createdAt", "desc").limit(50).get();

  const batch = dbRef.batch();
  for (const doc of recent.docs) {
    const data = doc.data();
    if (data.senderRole !== otherRole) continue;
    const patch: Record<string, unknown> = {};
    if (!data.deliveredAt) patch.deliveredAt = FieldValue.serverTimestamp();
    if (!data.readAt) patch.readAt = FieldValue.serverTimestamp();
    if (Object.keys(patch).length === 0) continue;
    batch.update(doc.ref, patch);
  }

  const updates: Record<string, unknown> =
    viewer === "admin"
      ? { unreadForAdmin: 0, adminReadAt: FieldValue.serverTimestamp() }
      : { unreadForCustomer: 0, customerReadAt: FieldValue.serverTimestamp() };

  batch.update(conversationRef, updates);

  await batch.commit();
}

/** Customer's own conversation view. */
export async function getMyConversation(user: AuthUser): Promise<PublicConversation> {
  return getOrCreateMyConversation(user);
}

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export async function listAllConversations(
  { limit = 30, before }: { limit?: number; before?: string } = {},
): Promise<{ conversations: PublicConversation[]; nextCursor: string | null }> {
  // Paginated: the inbox used to read 200 conversations on every 4-second poll,
  // which is what drained the Firestore quota. 30 per page is plenty for a
  // screen and costs a fraction of the reads.
  const pageSize = Math.min(Math.max(limit, 1), 50);
  let query = db()
    .collection(CONVERSATIONS)
    .orderBy("lastMessageAt", "desc")
    .limit(pageSize + 1);

  if (before) {
    const cursor = await db().collection(CONVERSATIONS).doc(before).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, pageSize);
  return {
    conversations: docs.map((doc) => toConversation(doc.id, doc.data())),
    nextCursor: snapshot.docs.length > pageSize ? docs[docs.length - 1]?.id ?? null : null,
  };
}

export async function getConversationForAdmin(uid: string): Promise<PublicConversation | null> {
  const snapshot = await db().collection(CONVERSATIONS).doc(uid).get();
  return snapshot.exists ? toConversation(uid, snapshot.data()!) : null;
}

/**
 * Everything the customer filled in on their profile page, for the admin panel.
 *
 * Read live from users/{uid} rather than the copy cached on the conversation, so
 * an address edited after the chat started is still correct.
 */
export type AdminCustomerProfile = {
  uid: string;
  conversation: PublicConversation;
  profile: {
    fullName: string;
    email: string | null;
    phoneNumber: string;
    buildingStreet: string;
    locality: string;
    region: string;
    city: string;
    area: string;
    address: string;
    label: string;
    birthday: string;
    gender: string;
    photoURL: string | null;
    coordinates: { latitude: number; longitude: number } | null;
    role: string;
    createdAt: string | null;
  };
  orders: Array<{
    id: string;
    reference: string;
    total: number;
    currency: string;
    itemCount: number;
    createdAt: string | null;
    status: ChatOrderStatus;
  }>;
};

export async function getCustomerProfileForAdmin(uid: string): Promise<AdminCustomerProfile | null> {
  const conversation = await getConversationForAdmin(uid);
  if (!conversation) return null;

  const profileSnap = await db().collection("users").doc(uid).get();
  const data = profileSnap.data() ?? {};
  const str = (value: unknown) => (typeof value === "string" ? value : "");

  // Order messages carry the order reference and total, so the admin can see
  // what this customer asked for without opening each conversation.
  const messages = await db()
    .collection(CONVERSATIONS)
    .doc(uid)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const orders = messages.docs
    .filter((doc) => doc.data().kind === "order" && doc.data().order)
    .map((doc) => {
      const order = doc.data().order as OrderPayload;
      return {
        id: doc.id,
        reference: order.reference,
        total: Object.values(order.totals ?? {})[0] ?? 0,
        currency: order.currency,
        itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
        createdAt: toIso(doc.data().createdAt),
        status: "sent" as ChatOrderStatus,
      };
    });

  // Merge the real lifecycle status of each referenced order.
  const statuses = await Promise.all(
    orders.map((order) => getOrder(order.reference).catch(() => null)),
  );
  for (const [index, record] of statuses.entries()) {
    if (record) orders[index].status = record.status;
  }

  return {
    uid,
    conversation,
    profile: {
      fullName: str(data.fullName) || conversation.customer.name,
      email: str(data.email) || conversation.customer.email || null,
      phoneNumber: str(data.phoneNumber),
      buildingStreet: str(data.buildingStreet),
      locality: str(data.locality),
      region: str(data.region),
      city: str(data.city),
      area: str(data.area),
      address: str(data.address),
      label: str(data.label),
      birthday: str(data.birthday),
      gender: str(data.gender),
      photoURL: str(data.photoURL) || null,
      coordinates: (data.coordinates as { latitude: number; longitude: number } | null) ?? null,
      role: str(data.role) || "user",
      createdAt: toIso(data.createdAt),
    },
    orders,
  };
}

/** Admin replies. Sending clears the "awaiting reply" flag immediately. */
export async function sendAdminMessage(
  admin: AuthUser,
  conversationUid: string,
  input: { kind: MessageKind; text?: string; attachment?: Attachment; replyTo?: ReplyPreview; clientId?: string },
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
    replyTo: input.replyTo,
    clientId: input.clientId,
  });

  const snapshot = await db().collection(CONVERSATIONS).doc(conversationUid).collection("messages").doc(id).get();

  void import("./push")
    .then(({ notifyCustomerOfAdminMessage }) =>
      notifyCustomerOfAdminMessage({
        customerUid: conversationUid,
        preview: preview(input.kind, input.text ?? ""),
        conversationId: conversationUid,
      }),
    )
    .catch(() => {});

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
