import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { resolveAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me
 *
 * The single gate for the admin panel. The client calls this on mount and only
 * renders the dashboard when it returns 200 — the URL alone grants nothing.
 *
 * Authorisation comes from `role: "admin"` on users/{uid} in Firestore, read on
 * every request. There is no email allow-list and nothing is written here, so
 * demoting someone takes effect immediately.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);

    if (!(await resolveAdmin(user))) {
      return NextResponse.json(
        { error: "You don't have access to the admin panel." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      admin: { uid: user.uid, email: user.email, role: "admin" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
