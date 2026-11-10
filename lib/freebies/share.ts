import type { PublicCampaign } from "./types";

export function getCampaignShareMessage(campaign: PublicCampaign) {
  const price = new Intl.NumberFormat("en", {
    style: "currency",
    currency: campaign.product.currency,
  }).format(campaign.product.price);

  return `I'm working toward unlocking ${campaign.product.title} (listed at ${price}) for free. Help by signing in and verifying your email. The goal is 15 unique verified referrals within 7 days, and no purchase is needed to help.`;
}
