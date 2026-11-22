import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { getCustomerProfileForAdmin, requireAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/** GET /api/admin/conversations/[uid]/profile — the customer's full details. */
export async function GET(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const user = await requireUser(request);
    await requireAdmin(user);

    const { uid } = await params;
    const profile = await getCustomerProfileForAdmin(uid);
    if (!profile) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    return NextResponse.json(profile);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
