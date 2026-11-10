import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { apiErrorResponse, ApiError, getAdminDb, requireVerifiedUser } from "@/lib/firebase/admin";
import { campaignStatus, getAvailableProduct } from "@/lib/referrals/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const user = await requireVerifiedUser(request);
    const { campaignId } = await params;
    const db = getAdminDb();
    const campaignRef = db.collection("freebieCampaigns").doc(campaignId);
    const initial = await campaignRef.get();
    if (!initial.exists) throw new ApiError("This campaign was not found.", 404);
    const initialData = initial.data()!;
    if (initialData.ownerUid === user.uid) throw new ApiError("You cannot refer yourself.", 400);
    if (new Date(user.metadata.creationTime).getTime() < (initialData.createdAt as Timestamp).toMillis()) {
      throw new ApiError("Only newly created accounts can count as referrals.", 403);
    }
    await getAvailableProduct(initialData.productId as string);

    const referralRef = campaignRef.collection("referrals").doc(user.uid);
    const uniqueReferralRef = db.collection("freebieReferralClaims").doc(user.uid);
    const count = await db.runTransaction(async (transaction) => {
      const [campaign, referral, previousClaim] = await Promise.all([
        transaction.get(campaignRef),
        transaction.get(referralRef),
        transaction.get(uniqueReferralRef),
      ]);
      if (!campaign.exists) throw new ApiError("This campaign was not found.", 404);
      const data = campaign.data()!;
      const status = campaignStatus(data);
      if (data.ownerUid === user.uid) throw new ApiError("You cannot refer yourself.", 400);
      if (status !== "active") throw new ApiError("This campaign is no longer accepting referrals.", 409);
      if ((data.referralCount as number) >= (data.target as number)) {
        throw new ApiError("This campaign already has enough referrals.", 409);
      }
      if (referral.exists || previousClaim.exists) {
        throw new ApiError("This account has already used its referral.", 409);
      }

      const nextCount = (data.referralCount as number) + 1;
      transaction.create(referralRef, {
        userUid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.create(uniqueReferralRef, {
        campaignId,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.update(campaignRef, {
        referralCount: nextCount,
        status: nextCount >= (data.target as number) ? "complete" : "active",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return nextCount;
    });

    return NextResponse.json({ referralCount: count, complete: count >= (initialData.target as number) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}