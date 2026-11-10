import { NextResponse } from "next/server";

import { apiErrorResponse, getAdminDb, requireVerifiedUser } from "@/lib/firebase/admin";
import { publicCampaign } from "@/lib/referrals/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const { campaignId } = await params;
    const db = getAdminDb();
    const snapshot = await db.collection("freebieCampaigns").doc(campaignId).get();
    if (!snapshot.exists) return NextResponse.json({ error: "This campaign was not found." }, { status: 404 });

    let viewerUid: string | undefined;
    try {
      viewerUid = (await requireVerifiedUser(request)).uid;
    } catch {
      viewerUid = undefined;
    }
    return NextResponse.json({ campaign: publicCampaign(snapshot.id, snapshot.data()!, viewerUid) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}