import type { Metadata } from "next";

import { FreebieCheckoutView } from "@/components/freebie-checkout-view";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = {
  title: "Get items for free",
  description: "Invite 15 verified friends in 7 days and get your cart item for ₨0 — no purchase needed.",
};

export default function FreebieCheckoutPage() {
  return (
    // No outer max-width: each screen sets its own so hero sections stay full-width on phones.
    <div className="flex flex-col gap-6">
      <FreebieCheckoutView />
      <ProductSuggestions />
    </div>
  );
}
