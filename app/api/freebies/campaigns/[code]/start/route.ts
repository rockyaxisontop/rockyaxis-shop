import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { startCampaignFromCode } from "@/lib/freebies/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/freebies/campaigns/:code/start
 * After helping with a referral, start your own campaign for the same product.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const user = await requireUser(request);
    const { code } = await params;
    return NextResponse.json({ campaign: await startCampaignFromCode(user, code) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
