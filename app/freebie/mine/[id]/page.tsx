import type { Metadata } from "next";

import { FreebieMine } from "@/components/freebie-mine";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = { title: "Your freebie campaign" };

export default async function FreebieMinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-8">
      <FreebieMine campaignId={id} />
      <ProductSuggestions />
    </div>
  );
}
