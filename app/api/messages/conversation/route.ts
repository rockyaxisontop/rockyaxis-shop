import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { getMyConversation } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/** GET /api/messages/conversation — the caller's conversation with MT Store. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ conversation: await getMyConversation(user) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
