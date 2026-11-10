import { NextResponse } from "next/server";

import { apiErrorResponse, optionalUser } from "@/lib/firebase/admin";
import { getCampaignByCode } from "@/lib/freebies/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/freebies/campaigns/:code — public campaign view for a referral link.
 * Works signed-out (the recipient has no account yet); the token, when present,
 * is only used to tell whether this viewer has already been counted.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const user = await optionalUser(request);
    const { code } = await params;
    return NextResponse.json({ campaign: await getCampaignByCode(code, user?.uid) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
