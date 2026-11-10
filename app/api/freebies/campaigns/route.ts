import { NextResponse } from "next/server";

import { apiErrorResponse, requireUser } from "@/lib/firebase/admin";
import { listMyCampaigns, startCampaign } from "@/lib/freebies/service";

export const dynamic = "force-dynamic";

/** GET /api/freebies/campaigns — the signed-in user's campaigns. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ campaigns: await listMyCampaigns(user) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** POST /api/freebies/campaigns { productId } — start or resume a campaign. */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { productId?: string };
    const campaign = await startCampaign(user, body.productId ?? "");
    return NextResponse.json({ campaign });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
