import type { Metadata } from "next";

import { CheckoutView } from "@/components/checkout-view";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; campaignId?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "free" ? "free" : "pay";
  return <CheckoutView mode={mode} campaignId={params.campaignId} />;
}