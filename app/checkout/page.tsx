import type { Metadata } from "next";

import { CheckoutView } from "@/components/checkout-view";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-8">
      <CheckoutView />
      <ProductSuggestions />
    </div>
  );
}
