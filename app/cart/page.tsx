import type { Metadata } from "next";

import { AdSlot } from "@/components/ad-slot";
import { CartView } from "@/components/cart-view";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="flex flex-col gap-8">
      <CartView />
      {/* Sponsored unit sits between the cart and the suggestions, never above
          the order summary where it would compete with checkout. */}
      <AdSlot variant="banner" label="Sponsored" />
      <ProductSuggestions />
    </div>
  );
}
