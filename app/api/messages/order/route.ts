import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, getAdminDb, requireUser } from "@/lib/firebase/admin";
import { orderedLineKeys } from "@/lib/messaging/orders";
import { sendOrderMessage } from "@/lib/messaging/service";
import type { OrderLine } from "@/lib/messaging/types";
import { clientKey, invalidateOrders, rateLimit, tooManyRequests } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

type CartRow = {
  id?: string;
  productId?: string;
  title?: string;
  image?: string;
  url?: string;
  options?: Record<string, string>;
  quantity?: number;
  price?: number;
  currency?: string;
};

/**
 * POST /api/messages/order
 *
 * Sends the customer's cart to MT Store as one order message.
 *
 * The lines are read from the customer's OWN cart in Firestore — never from the
 * request body — so the prices and quantities the shop sees are the real ones.
 * If `cartIds` is provided, only those rows are sent (single-item "Buy this
 * item"); otherwise the whole cart is.
 *
 * The order token is derived from the cart contents, which makes the call
 * idempotent across refreshes and double clicks.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    // Placing an order writes several documents — keep it to a sane pace.
    const limit = rateLimit(`order:${clientKey(request, user.uid)}`, 6, 60_000);
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);

    const body = (await request.json().catch(() => ({}))) as { cartIds?: string[] };

    const snapshot = await getAdminDb().collection("carts").doc(user.uid).collection("items").get();
    const rows = snapshot.docs
      .map((doc) => ({ ...(doc.data() as CartRow), id: doc.id }))
      .filter((row) => !body.cartIds?.length || body.cartIds.includes(row.id ?? ""));

    if (rows.length === 0) throw new ApiError("Your cart is empty.", 400);

    // Never re-send lines that are already in an open or completed order: the
    // admin would otherwise receive (and pay for) the same product twice.
    // `recordedLineIds` from the client is only a hint — the authoritative list
    // is rebuilt here from chatOrders, which the client cannot forge.
    const alreadyOrdered = await orderedLineKeys(user.uid);
    const freshRows = rows.filter(
      (row) => !alreadyOrdered.has(`${row.productId}|${JSON.stringify(row.options ?? {})}`),
    );

    if (freshRows.length === 0) {
      throw new ApiError("Everything in your cart is already in an order.", 409);
    }

    const lines: OrderLine[] = freshRows.map((row) => ({
      productId: String(row.productId ?? ""),
      title: String(row.title ?? "Product"),
      image: row.image,
      url: row.url,
      options: row.options ?? {},
      quantity: Number(row.quantity ?? 1),
      price: Number(row.price ?? 0),
      currency: String(row.currency ?? "USD"),
    }));

    const currency = lines[0]?.currency ?? "USD";
    const totals: Record<string, number> = {};
    for (const line of lines) {
      totals[line.currency] = (totals[line.currency] ?? 0) + line.price * line.quantity;
    }

    const reference = `MT-${createHash("sha256")
      .update(JSON.stringify({ uid: user.uid, lines }))
      .digest("hex")
      .slice(0, 8)
      .toUpperCase()}`;

    const { message, duplicated } = await sendOrderMessage(
      user,
      { reference, lines, totals, currency },
      reference,
    );

    // A new order appears in the customer's cart status straight away.
    invalidateOrders(user.uid);

    return NextResponse.json({ message, duplicated, conversationId: user.uid });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
