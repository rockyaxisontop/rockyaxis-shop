import { createHash, randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { apiErrorResponse, getAdminDb, requireVerifiedUser } from "@/lib/firebase/admin";
import { CAMPAIGN_DURATION_MS, getAvailableProduct, REFERRAL_TARGET } from "@/lib/referrals/server";

type CampaignResult = {
  id: string;
  product: { title: string; image: string | null; brand: string | null; category: string | null };
  target: number;
  referralCount: number;
  status: string;
  expiresAt: Timestamp;
};

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser(request);
    const body = (await request.json().catch(() => ({}))) as { productId?: unknown };
    if (typeof body.productId !== "string" || !body.productId.trim()) {
      return NextResponse.json({ error: "A product is required." }, { status: 400 });
    }

    const product = await getAvailableProduct(body.productId.trim());
    const db = getAdminDb();
    const ownerProductKey = createHash("sha256")
      .update(`${user.uid}:${product.id}`)
      .digest("hex");
    const indexRef = db.collection("freebieCampaignIndexes").doc(ownerProductKey);
    const campaignId = randomUUID();
    const campaignRef = db.collection("freebieCampaigns").doc(campaignId);
    const now = Timestamp.now();
    const campaignData = await db.runTransaction<CampaignResult>(async (transaction) => {
      const index = await transaction.get(indexRef);
      if (index.exists && typeof index.data()?.campaignId === "string") {
        const existingRef = db.collection("freebieCampaigns").doc(index.data()!.campaignId as string);
        const existing = await transaction.get(existingRef);
        if (existing.exists) {
          const current = existing.data()!;
          const expiresAt = current.expiresAt as Timestamp;
          if (["active", "complete"].includes(current.status) && expiresAt.toMillis() > now.toMillis()) {
            return { id: existing.id, ...current } as CampaignResult;
          }
        }
      }

      const data = {
        ownerUid: user.uid,
        productId: product.id,
        product: {
          title: product.title,
          image: product.images?.[0]?.url ?? null,
          brand: product.brands?.[0]?.name ?? null,
          category: product.category?.title ?? null,
        },
        target: REFERRAL_TARGET,
        referralCount: 0,
        status: "active",
        createdAt: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() + CAMPAIGN_DURATION_MS),
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.create(campaignRef, data);
      transaction.set(indexRef, { campaignId, updatedAt: FieldValue.serverTimestamp() });
      return { id: campaignId, ...data } as CampaignResult;
    });

    return NextResponse.json({
      campaign: {
        id: campaignData.id,
        product: campaignData.product,
        target: campaignData.target,
        referralCount: campaignData.referralCount,
        status: campaignData.status,
        expiresAt: (campaignData.expiresAt as Timestamp).toDate().toISOString(),
        isOwner: true,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}