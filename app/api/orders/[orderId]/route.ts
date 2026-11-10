import { NextResponse } from "next/server";

import { apiErrorResponse, getAdminDb, requireVerifiedUser } from "@/lib/firebase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const user = await requireVerifiedUser(request);
    const { orderId } = await params;
    const snapshot = await getAdminDb()
      .collection("orders")
      .doc(user.uid)
      .collection("history")
      .doc(orderId)
      .get();
    if (!snapshot.exists) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ order: { id: snapshot.id, ...snapshot.data() } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}