import type { Metadata } from "next";

import { OrderDetails } from "@/components/orders/order-details";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default async function OrderDetailsPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <OrderDetails reference={reference} />;
}
