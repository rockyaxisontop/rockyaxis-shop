import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { markConversationRead, requireAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/** POST /api/admin/conversations/[uid]/read — admin has opened the thread. */
export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const user = await requireUser(request);
    await requireAdmin(user);

    const { uid } = await params;
    await markConversationRead(uid, "admin");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
