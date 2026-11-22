import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { getAdminStats, listAllConversations, requireAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/** GET /api/admin/conversations — every customer conversation, newest first. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    await requireAdmin(user);

    const [conversations, stats] = await Promise.all([listAllConversations(), getAdminStats()]);
    return NextResponse.json({ conversations, stats });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
