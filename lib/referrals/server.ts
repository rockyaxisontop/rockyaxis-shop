import "server-only";

import type { Product } from "@channel3/sdk/resources";

import { getProduct } from "@/lib/channel3/products";
import { ApiError } from "@/lib/firebase/admin";

export const REFERRAL_TARGET = 15;
export const CAMPAIGN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function getAvailableProduct(productId: string): Promise<Product> {
  try {
    const product = await getProduct(productId);
    if (!product.offers?.some((offer) => offer.availability === "InStock")) {
      throw new ApiError("This product is currently out of stock.", 409);
    }
    return product;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("We could not verify product availability. Please try again later.", 503);
  }
}

export function campaignStatus(data: FirebaseFirestore.DocumentData) {
  const expiresAt = data.expiresAt as FirebaseFirestore.Timestamp;
  if (data.status === "active" && expiresAt.toMillis() <= Date.now()) return "expired";
  return data.status as string;
}

export function publicCampaign(
  id: string,
  data: FirebaseFirestore.DocumentData,
  viewerUid?: string,
) {
  const expiresAt = data.expiresAt as FirebaseFirestore.Timestamp;
  return {
    id,
    productId: data.productId as string,
    product: data.product,
    target: data.target as number,
    referralCount: data.referralCount as number,
    status: campaignStatus(data),
    expiresAt: expiresAt.toDate().toISOString(),
    isOwner: viewerUid === data.ownerUid,
  };
}