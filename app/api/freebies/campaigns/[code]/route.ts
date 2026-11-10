import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { getCampaignByCode } from "@/lib/freebies/service";

export const dynamic = "force-dynamic";

/** GET /api/freebies/campaigns/:code — public campaign view for a referral link. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const user = await requireUser(request);
    const { code } = await params;
    return NextResponse.json({ campaign: await getCampaignByCode(code, user.uid) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
