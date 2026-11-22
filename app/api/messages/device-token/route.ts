import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { registerDeviceToken, removeDeviceToken } from "@/lib/messaging/push";
import { resolveAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/messages/device-token  { token }
 *
 * Stores the caller's FCM web-push token. A token is filed under the admin
 * collection only if the database says this user is an admin — never because
 * the client claims so.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    const token = String(body.token ?? "").trim();
    if (!token) throw new ApiError("A device token is required.", 400);

    const admin = await resolveAdmin(user);
    await registerDeviceToken(user.uid, token, {
      admin,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ ok: true, admin });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** DELETE /api/messages/device-token { token } — e.g. after signing out. */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    const token = String(body.token ?? "").trim();
    if (!token) throw new ApiError("A device token is required.", 400);

    const admin = await resolveAdmin(user);
    await removeDeviceToken(user.uid, token, { admin });
    await removeDeviceToken(user.uid, token, { admin: !admin });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
