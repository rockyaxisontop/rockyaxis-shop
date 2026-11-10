import type { Metadata } from "next";

import { FreebieCampaignView } from "@/components/freebie-campaign-view";

export const metadata: Metadata = { title: "Freebie referral" };

export default async function FreebieCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <FreebieCampaignView campaignId={campaignId} />;
}