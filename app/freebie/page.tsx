import type { Metadata } from "next";

import { FreebieCheckoutView } from "@/components/freebie-checkout-view";

export const metadata: Metadata = { title: "Get items for free" };

export default function FreebieCheckoutPage() {
  return <FreebieCheckoutView />;
}
