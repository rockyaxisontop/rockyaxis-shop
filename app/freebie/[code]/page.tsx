import { AdCluster, AdSlot } from "@/components/ad-slot";
import { FreebieClaim } from "@/components/freebie-claim";
import { ProductSuggestions } from "@/components/product-suggestions";

export default async function FreebieCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="flex flex-col gap-8">
      <AdSlot variant="banner" label="Sponsored" />
      <FreebieClaim code={code} />
      <AdSlot variant="strip" label="Sponsored" />
      <ProductSuggestions />
      <AdCluster />

      {/* One extra in-feed partner unit, far below the pledge card. */}
      <AdSlot variant="native" label="You might also like" />
    </div>
  );
}
