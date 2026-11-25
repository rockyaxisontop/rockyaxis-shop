import type { Metadata } from "next";

import { AdCluster, AdSlot } from "@/components/ad-slot";
import { FreebieMine } from "@/components/freebie-mine";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = { title: "Your freebie campaign" };

export default async function FreebieMinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-8">
      <AdSlot variant="banner" label="Sponsored" />
      <FreebieMine campaignId={id} />
      <AdSlot variant="strip" label="Sponsored" />
      <ProductSuggestions />
      <AdCluster />
    </div>
  );
}
