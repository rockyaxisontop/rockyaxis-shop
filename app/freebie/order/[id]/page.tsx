import type { Metadata } from "next";

import { FreebieOrderConfirmation } from "@/components/freebie-order-confirmation";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function FreebieOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FreebieOrderConfirmation orderId={id} />;
}
