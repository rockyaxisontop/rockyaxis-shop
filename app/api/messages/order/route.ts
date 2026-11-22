import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, getAdminDb, requireUser } from "@/lib/firebase/admin";
import { sendOrderMessage } from "@/lib/messaging/service";
import type { OrderLine } from "@/lib/messaging/types";

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
    const body = (await request.json().catch(() => ({}))) as { cartIds?: string[] };

    const snapshot = await getAdminDb().collection("carts").doc(user.uid).collection("items").get();
    const rows = snapshot.docs
      .map((doc) => ({ ...(doc.data() as CartRow), id: doc.id }))
      .filter((row) => !body.cartIds?.length || body.cartIds.includes(row.id ?? ""));

    if (rows.length === 0) throw new ApiError("Your cart is empty.", 400);

    const lines: OrderLine[] = rows.map((row) => ({
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

    return NextResponse.json({ message, duplicated, conversationId: user.uid });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
