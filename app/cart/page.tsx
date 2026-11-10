import type { Metadata } from "next";

import { CartView } from "@/components/cart-view";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="flex flex-col gap-8">
      <CartView />
      <ProductSuggestions />
    </div>
  );
}
