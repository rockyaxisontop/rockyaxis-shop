import type { Metadata } from "next";

import { FreebieClaim } from "@/components/freebie-claim";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = { title: "Freebie referral" };

export default async function FreebiePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="flex flex-col gap-8">
      <FreebieClaim code={code} />
      <ProductSuggestions />
    </div>
  );
}
