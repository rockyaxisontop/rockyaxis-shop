import type { Metadata } from "next";

import { FreebieCheckoutView } from "@/components/freebie-checkout-view";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = { title: "Get items for free" };

export default function FreebieCheckoutPage() {
  return (
    <div className="flex flex-col gap-8">
      <FreebieCheckoutView />
      <ProductSuggestions />
    </div>
  );
}
