import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { setOrderStatus, type ChatOrderStatus } from "@/lib/messaging/orders";

export const dynamic = "force-dynamic";

const STATUSES: ChatOrderStatus[] = ["sent", "awaiting_payment", "confirmed", "cancelled"];

/**
 * POST /api/messages/orders/[reference]/status { status }
 *
 * The customer cancelling before payment. Admins use the admin route.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const user = await requireUser(request);
    const { reference } = await params;
    const body = (await request.json().catch(() => ({}))) as { status?: ChatOrderStatus };
    const status = body.status && STATUSES.includes(body.status) ? body.status : null;
    if (!status) throw new ApiError("A valid status is required.", 400);

    return NextResponse.json({ order: await setOrderStatus("customer", reference, status, user) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
