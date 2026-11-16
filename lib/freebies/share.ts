import type { PublicCampaign } from "./types";

export function getCampaignShareMessage(campaign: PublicCampaign) {
  const price = new Intl.NumberFormat("en", {
    style: "currency",
    currency: campaign.product.currency,
  }).format(campaign.product.price);

  const left = Math.max(0, campaign.target - campaign.referralCount);

  return `I can get ${campaign.product.title} (worth ${price}) for FREE — I just need ${left} more people to tap my link. It takes 10 seconds, no payment, no purchase. Help me out? 🙏`;
}
