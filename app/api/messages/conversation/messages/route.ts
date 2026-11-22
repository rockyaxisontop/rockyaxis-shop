import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { listMessages } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/** GET /api/messages/conversation/messages?before=<id>&limit=<n> */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const before = url.searchParams.get("before") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? 30);

    // A customer can only ever read their own thread.
    const messages = await listMessages(user.uid, {
      before,
      limit: Number.isFinite(limit) ? limit : 30,
    });
    return NextResponse.json({ messages });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
