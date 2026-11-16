import { convertFromUsd, formatLocal } from "@/lib/currency";

import type { PublicCampaign } from "./types";

/**
 * The invite text a friend receives. Prices are shown in the recipient's OWN
 * currency when the sharer's browser knows it, so the message reads naturally
 * to whoever opens it.
 */
export function getCampaignShareMessage(campaign: PublicCampaign, currency?: string) {
  const code = (currency ?? campaign.product.currency).toUpperCase();
  const amount = currency
    ? convertFromUsd(campaign.product.price, code)
    : campaign.product.price;
  const price = formatLocal(amount, code);

  const left = Math.max(0, campaign.target - campaign.referralCount);

  return `I can get ${campaign.product.title} (worth ${price}) for FREE — I just need ${left} more people to tap my link. It takes 10 seconds, no payment, no purchase. Help me out? 🙏`;
}
