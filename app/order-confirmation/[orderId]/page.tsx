import type { Metadata } from "next";

import { OrderConfirmationView } from "@/components/order-confirmation-view";

export const metadata: Metadata = { title: "Order confirmation" };

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderConfirmationView orderId={orderId} />;
}