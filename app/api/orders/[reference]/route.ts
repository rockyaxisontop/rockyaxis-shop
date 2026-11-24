import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { getOrder } from "@/lib/messaging/orders";
import { listMessages } from "@/lib/messaging/service";
import type { OrderPayload } from "@/lib/messaging/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[reference] — one order with the products it contains.
 *
 * The order record stores only ids and totals (cheap to keep); the product
 * titles/images live on the order MESSAGE already in the customer's own
 * conversation. This joins the two on the server so the details page needs ONE
 * request from the browser.
 */
export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const user = await requireUser(request);
    const { reference } = await params;

    const order = await getOrder(reference);
    if (!order) throw new ApiError("Order not found.", 404);
    if (order.customerUid !== user.uid) throw new ApiError("This isn't your order.", 403);

    // Find the matching order message (already paginated, newest first).
    const messages = await listMessages(order.customerUid, { limit: 50 });
    const match = messages.find(
      (message) => message.kind === "order" && message.order?.reference === reference,
    );
    const payload: OrderPayload | null = match?.order ?? null;

    return NextResponse.json({
      order,
      items: payload?.lines ?? [],
      totals: payload?.totals ?? { [order.currency]: order.total },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
