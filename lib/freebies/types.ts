/** Shared types for the cart-based freebie referral feature. */

export const REFERRAL_TARGET = 15;
export const CAMPAIGN_DAYS = 7;

export type CampaignStatus = "active" | "completed" | "expired" | "cancelled";

export type CampaignProduct = {
  productId: string;
  title: string;
  image?: string;
  brand?: string;
  price: number;
  currency: string;
  url?: string;
  options?: Record<string, string>;
};

/** What the browser is allowed to see about a campaign. */
export type PublicCampaign = {
  id: string;
  code: string;
  product: CampaignProduct;
  target: number;
  referralCount: number;
  status: CampaignStatus;
  expiresAt: string;
  isOwner: boolean;
  /** True when the viewer has already been counted for this campaign. */
  alreadyReferred: boolean;
  /** True when the viewer is the owner (cannot refer themselves). */
  isSelf: boolean;
};

export type FreebieOrder = {
  id: string;
  campaignId: string;
  product: CampaignProduct;
  total: number;
  currency: string;
  status: "confirmed";
  createdAt: string;
};
