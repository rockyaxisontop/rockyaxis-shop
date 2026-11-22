import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { setOrderStatus, type ChatOrderStatus } from "@/lib/messaging/orders";
import { requireAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

const STATUSES: ChatOrderStatus[] = ["sent", "awaiting_payment", "confirmed", "cancelled"];

/**
 * POST /api/admin/orders/[reference]/status { status }
 *
 * The admin's side of an order: accept it (awaiting_payment), mark it
 * successful (confirmed) or cancel it — from inside the conversation.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const user = await requireUser(request);
    await requireAdmin(user);

    const { reference } = await params;
    const body = (await request.json().catch(() => ({}))) as { status?: ChatOrderStatus };
    const status = body.status && STATUSES.includes(body.status) ? body.status : null;
    if (!status) throw new ApiError("A valid status is required.", 400);

    const order = await setOrderStatus("admin", reference, status, user);

    // Tell the customer their order moved on. Fire-and-forget: a push failure
    // must never make the status change itself fail.
    const notifyStatus = order.status;
    if (
      notifyStatus === "awaiting_payment" ||
      notifyStatus === "confirmed" ||
      notifyStatus === "cancelled"
    ) {
      const statusForPush: "awaiting_payment" | "confirmed" | "cancelled" = notifyStatus;
      void import("@/lib/messaging/push")
        .then(({ notifyCustomerOfOrderStatus }) =>
          notifyCustomerOfOrderStatus({
            customerUid: order.customerUid,
            reference: order.reference,
            status: statusForPush,
          }),
        )
        .catch(() => {});
    }

    return NextResponse.json({ order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
