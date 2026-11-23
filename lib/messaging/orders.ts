import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { ApiError, getAdminDb, type AuthUser } from "@/lib/firebase/admin";

/**
 * Chat orders placed from the cart/checkout.
 *
 * The customer sends their cart as an order message; the admin confirms it in the
 * same conversation. Status lives in `chatOrders/{reference}` (server-only), so
 * both sides read one source of truth:
 *
 *   sent            → the message exists, nobody acted yet (customer can cancel)
 *   awaiting_payment→ admin accepted, customer should pay
 *   confirmed       → admin marked it paid / successful
 *   cancelled       → customer or admin cancelled
 */

const ORDERS = "chatOrders";

export type ChatOrderStatus = "sent" | "awaiting_payment" | "confirmed" | "cancelled";

export type ChatOrder = {
  reference: string;
  customerUid: string;
  status: ChatOrderStatus;
  currency: string;
  total: number;
  itemCount: number;
  lineIds: string[];
  createdAt: string | null;
  updatedAt: string | null;
  confirmedAt: string | null;
};

function db() {
  return getAdminDb();
}

function toIso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

function toOrder(data: FirebaseFirestore.DocumentData): ChatOrder {
  return {
    reference: data.reference as string,
    customerUid: data.customerUid as string,
    status: (data.status as ChatOrderStatus) ?? "sent",
    currency: (data.currency as string) ?? "USD",
    total: (data.total as number) ?? 0,
    itemCount: (data.itemCount as number) ?? 0,
    lineIds: (data.lineIds as string[]) ?? [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    confirmedAt: toIso(data.confirmedAt),
  };
}

/** Creates/refreshes the order record for a freshly-sent order message. */
export async function recordOrder(input: {
  reference: string;
  customerUid: string;
  currency: string;
  total: number;
  itemCount: number;
  lineIds: string[];
}): Promise<ChatOrder> {
  const ref = db().collection(ORDERS).doc(input.reference);
  const existing = await ref.get();
  // Re-sending the same cart must not reset an order the admin already handled.
  if (existing.exists) return toOrder(existing.data()!);

  await ref.set({
    ...input,
    status: "sent",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return toOrder((await ref.get()).data()!);
}

export async function getOrder(reference: string): Promise<ChatOrder | null> {
  const snapshot = await db().collection(ORDERS).doc(reference).get();
  return snapshot.exists ? toOrder(snapshot.data()!) : null;
}

/** Every order in one customer's conversation, newest first. */
export async function listOrdersForCustomer(uid: string): Promise<ChatOrder[]> {
  const snapshot = await db().collection(ORDERS).where("customerUid", "==", uid).limit(100).get();
  return snapshot.docs
    .map((doc) => toOrder(doc.data()))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
}

/**
 * Line keys this customer has in an order that is still BEING HANDLED.
 *
 * Only `sent` and `awaiting_payment` block a re-order: the admin is holding those
 * lines, so letting the customer change or re-send them would desync the order.
 * A `confirmed` order is finished business — the customer may buy the same
 * product again — and `cancelled` frees the line completely.
 */
export async function orderedLineKeys(uid: string): Promise<Set<string>> {
  const orders = await listOrdersForCustomer(uid);
  const keys = new Set<string>();
  for (const order of orders) {
    if (order.status !== "sent" && order.status !== "awaiting_payment") continue;
    for (const lineId of order.lineIds) keys.add(lineId);
  }
  return keys;
}

/** Admin actions allowed on a chat order. */
const ADMIN_TRANSITIONS: Record<ChatOrderStatus, ChatOrderStatus[]> = {
  sent: ["awaiting_payment", "confirmed", "cancelled"],
  awaiting_payment: ["confirmed", "cancelled"],
  confirmed: [],
  cancelled: [],
};

/**
 * Moves an order to `next`, refusing anything that isn't a valid transition.
 * `actor` decides who is allowed what: only the admin may confirm, and the
 * customer may only cancel before payment is requested.
 */
export async function setOrderStatus(
  actor: "admin" | "customer",
  reference: string,
  next: ChatOrderStatus,
  viewer: AuthUser,
): Promise<ChatOrder> {
  const ref = db().collection(ORDERS).doc(reference);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new ApiError("Order not found.", 404);

  const order = toOrder(snapshot.data()!);
  if (actor === "customer" && order.customerUid !== viewer.uid) {
    throw new ApiError("This isn't your order.", 403);
  }

  const allowed =
    actor === "admin"
      ? ADMIN_TRANSITIONS[order.status]
      : order.status === "sent"
        ? (["cancelled"] as ChatOrderStatus[])
        : [];

  if (!allowed.includes(next)) {
    throw new ApiError(`An order that is “${order.status}” can't be marked “${next}”.`, 409);
  }

  const patch: Record<string, unknown> = { status: next, updatedAt: FieldValue.serverTimestamp() };
  if (next === "confirmed") patch.confirmedAt = FieldValue.serverTimestamp();
  await ref.update(patch);

  return toOrder((await ref.get()).data()!);
}

export const ORDER_FIELD = "order";
