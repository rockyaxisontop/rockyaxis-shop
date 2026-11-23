import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { getAdminStats, listAllConversations, requireAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/** GET /api/admin/conversations?before=<id> — newest first, one page at a time. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    await requireAdmin(user);

    const before = new URL(request.url).searchParams.get("before") ?? undefined;
    const [page, stats] = await Promise.all([listAllConversations({ before }), getAdminStats()]);
    return NextResponse.json({
      conversations: page.conversations,
      nextCursor: page.nextCursor,
      stats,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
