import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { recordAdminDocument, resolveAdmin } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me
 *
 * The single gate for the admin panel. The client calls this on mount and only
 * renders the dashboard when it returns 200 — the URL alone grants nothing.
 *
 * Authorisation is the verified token email against ADMIN_EMAILS. If that fails
 * we return 403 immediately and write nothing.
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

    // Authorised — keep the audit record in sync (best effort, never blocking).
    await recordAdminDocument(user).catch(() => {});

    return NextResponse.json({
      admin: { uid: user.uid, email: user.email, role: "admin" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
