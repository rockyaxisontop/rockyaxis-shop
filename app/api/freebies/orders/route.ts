import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { listMyOrders, placeFreebieOrder } from "@/lib/freebies/service";

export const dynamic = "force-dynamic";

/** GET /api/freebies/orders — the signed-in user's free orders. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ orders: await listMyOrders(user) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** POST /api/freebies/orders { campaignId } — place the NPR 0 order. */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { campaignId?: string };
    if (!body.campaignId) {
      return NextResponse.json({ error: "A campaign id is required." }, { status: 400 });
    }
    return NextResponse.json({ order: await placeFreebieOrder(user, body.campaignId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
