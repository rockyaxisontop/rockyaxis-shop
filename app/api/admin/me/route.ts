import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { ensureAdminDocument, resolveAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me
 *
 * The single gate for the admin panel. The client calls this on mount and only
 * renders the dashboard when it returns 200 — the URL alone grants nothing.
 *
 * On success it also ensures the `admins/{uid}` document exists, so adding an
 * admin only means setting ADMIN_EMAILS.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);

    if (!(await resolveAdmin(user))) {
      // Allow first-time admins to self-provision their allow-list document,
      // but only if their verified email is on ADMIN_EMAILS.
      await ensureAdminDocument(user);
    }

    return NextResponse.json({
      admin: {
        uid: user.uid,
        email: user.email,
        role: "admin",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
