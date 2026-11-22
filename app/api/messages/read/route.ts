import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { markConversationRead } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/** POST /api/messages/read — customer has seen MT Store's replies. */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    await markConversationRead(user.uid, "customer");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
