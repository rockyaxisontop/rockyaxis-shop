import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, getAdminDb, requireUser } from "@/lib/firebase/admin";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

const COLLECTION = "carts";

function itemsRef(uid: string) {
  return getAdminDb().collection(COLLECTION).doc(uid).collection("items");
}

/** Stable cart-row id: product + chosen variant (same rule the app used). */
function cartItemId(item: { productId: string; options?: Record<string, string> }) {
  const suffix = item.options
    ? Object.entries(item.options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join("|")
    : "";
  return suffix ? `${item.productId}__${suffix}` : item.productId;
}

/**
 * GET /api/cart — the signed-in customer's cart.
 *
 * Moving this behind the API is what allows `carts/*` to be closed to clients
 * entirely (no read, no write) while the cart keeps working.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const snapshot = await itemsRef(user.uid).get();
    return NextResponse.json({
      items: snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/cart  { action, item?, id?, quantity? }
 *
 * One endpoint for the three cart mutations. The uid always comes from the
 * verified token — never the body — so a caller can only ever edit their own cart.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    // A cart syncs often (optimistic UI), but not unboundedly.
    const limit = rateLimit(`cart:${clientKey(request, user.uid)}`, 60, 60_000);
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);

    const body = (await request.json().catch(() => ({}))) as {
      action?: "add" | "quantity" | "remove";
      item?: { productId?: string; options?: Record<string, string>; quantity?: number } & Record<
        string,
        unknown
      >;
      id?: string;
      quantity?: number;
    };

    if (body.action === "add") {
      if (!body.item?.productId) throw new ApiError("A product is required.", 400);
      const id = cartItemId({
        productId: String(body.item.productId),
        options: body.item.options,
      });
      const quantity = Math.max(1, Math.floor(Number(body.item.quantity ?? 1)) || 1);

      await itemsRef(user.uid)
        .doc(id)
        .set(
          { ...body.item, id, quantity, updatedAt: new Date() },
          { merge: true },
        );
      return NextResponse.json({ ok: true, id });
    }

    if (body.action === "quantity") {
      if (!body.id) throw new ApiError("A cart row is required.", 400);
      const quantity = Math.floor(Number(body.quantity ?? 0));
      if (quantity < 1) {
        await itemsRef(user.uid).doc(body.id).delete();
        return NextResponse.json({ ok: true, removed: true });
      }
      await itemsRef(user.uid).doc(body.id).set({ quantity, updatedAt: new Date() }, { merge: true });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "remove") {
      if (!body.id) throw new ApiError("A cart row is required.", 400);
      await itemsRef(user.uid).doc(body.id).delete();
      return NextResponse.json({ ok: true });
    }

    throw new ApiError("Unknown cart action.", 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
