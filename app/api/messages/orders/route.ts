import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { listOrdersForCustomer } from "@/lib/messaging/orders";
import { cached } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages/orders — this customer's chat orders and their statuses.
 *
 * Cached for 30 seconds per customer. The cart and checkout pages poll this, so
 * without a cache every poll was a Firestore read — that is what burned through
 * the daily quota. A status change invalidates the entry immediately (see
 * `invalidateOrderCache`), so a confirmed order still appears at once.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const orders = await cached(`orders:${user.uid}`, 30_000, () =>
      listOrdersForCustomer(user.uid),
    );
    return NextResponse.json({ orders }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
