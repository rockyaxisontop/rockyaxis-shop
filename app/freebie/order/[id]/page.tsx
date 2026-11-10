import type { Metadata } from "next";

import { FreebieOrderConfirmation } from "@/components/freebie-order-confirmation";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function FreebieOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-8">
      <FreebieOrderConfirmation orderId={id} />
      <ProductSuggestions />
    </div>
  );
}
