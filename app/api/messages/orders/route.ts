import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { listOrdersForCustomer } from "@/lib/messaging/orders";

export const dynamic = "force-dynamic";

/** GET /api/messages/orders — this customer's chat orders and their statuses. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ orders: await listOrdersForCustomer(user.uid) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
