import type { Metadata } from "next";

import { AdSlot } from "@/components/ad-slot";
import { CheckoutView } from "@/components/checkout-view";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-8">
      <CheckoutView />
      {/* Below the whole checkout form — nothing sponsored appears next to the
          final action. */}
      <AdSlot variant="banner" label="Sponsored" />
      <ProductSuggestions />
    </div>
  );
}
