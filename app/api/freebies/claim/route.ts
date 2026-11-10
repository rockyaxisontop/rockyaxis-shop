import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { claimReferral } from "@/lib/freebies/service";

export const dynamic = "force-dynamic";

/** POST /api/freebies/claim { code } — count this user as one referral. */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    if (!body.code) {
      return NextResponse.json({ error: "A referral code is required." }, { status: 400 });
    }
    return NextResponse.json(await claimReferral(user, body.code));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
