import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { apiErrorResponse, ApiError, getAdminDb, requireVerifiedUser } from "@/lib/firebase/admin";
import { campaignStatus, getAvailableProduct, REFERRAL_TARGET } from "@/lib/referrals/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const user = await requireVerifiedUser(request);
    const { campaignId } = await params;
    const db = getAdminDb();
    const campaignRef = db.collection("freebieCampaigns").doc(campaignId);
    const campaignSnapshot = await campaignRef.get();
    if (!campaignSnapshot.exists) throw new ApiError("This campaign was not found.", 404);

    const campaign = campaignSnapshot.data()!;
    if (campaign.ownerUid !== user.uid) throw new ApiError("This is not your campaign.", 403);
    if (campaignStatus(campaign) !== "complete" || campaign.referralCount < REFERRAL_TARGET) {
      throw new ApiError("Complete all 15 referrals before placing a free order.", 409);
    }
    const product = await getAvailableProduct(campaign.productId as string);
    const profileSnapshot = await db.collection("users").doc(user.uid).get();
    const profile = profileSnapshot.data();
    const requiredFields = ["fullName", "phoneNumber", "buildingStreet", "locality", "region", "city", "area"];
    if (!profile || requiredFields.some((field) => typeof profile[field] !== "string" || !profile[field].trim())) {
      throw new ApiError("Complete your delivery information before placing the order.", 400);
    }

    const orderRef = db.collection("orders").doc(user.uid).collection("history").doc(campaignId);
    const order = await db.runTransaction(async (transaction) => {
      const [currentCampaign, existingOrder] = await Promise.all([
        transaction.get(campaignRef),
        transaction.get(orderRef),
      ]);
      if (!currentCampaign.exists) throw new ApiError("This campaign was not found.", 404);
      if (existingOrder.exists) throw new ApiError("This campaign already has an order.", 409);

      const current = currentCampaign.data()!;
      const expiresAt = current.expiresAt as Timestamp;
      if (current.ownerUid !== user.uid) throw new ApiError("This is not your campaign.", 403);
      if (current.status !== "complete" || current.referralCount < REFERRAL_TARGET) {
        throw new ApiError("The referral goal has not been completed.", 409);
      }
      if (expiresAt.toMillis() <= Date.now()) throw new ApiError("This campaign has expired.", 409);

      const orderData = {
        status: "pending_fulfillment",
        type: "freebie",
        campaignId,
        referralCount: current.referralCount,
        items: [{
          productId: product.id,
          title: product.title,
          image: product.images?.[0]?.url ?? null,
          brand: product.brands?.[0]?.name ?? null,
          quantity: 1,
          price: 0,
          currency: "NPR",
        }],
        subtotal: 0,
        currency: "NPR",
        email: user.email,
        shipping: {
          fullName: profile.fullName,
          phoneNumber: profile.phoneNumber,
          buildingStreet: profile.buildingStreet,
          locality: profile.locality,
          region: profile.region,
          city: profile.city,
          area: profile.area,
          address: profile.address ?? "",
          label: profile.label ?? "Home",
        },
        createdAt: FieldValue.serverTimestamp(),
      };

      transaction.create(orderRef, orderData);
      transaction.update(campaignRef, {
        status: "ordered",
        orderId: campaignId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return orderData;
    });

    return NextResponse.json({ orderId: campaignId, order });
  } catch (error) {
    return apiErrorResponse(error);
  }
}