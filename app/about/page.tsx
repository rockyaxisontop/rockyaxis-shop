import type { Metadata } from "next";

import { AboutContent } from "@/components/about-content";
import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = {
  title: "About MT Store",
  description: "Learn how MT Store helps you discover products and compare offers from online stores.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  // The product feed is a server component; it is passed through as a slot so
  // the country-aware content around it can stay client-side.
  return <AboutContent suggestions={<ProductSuggestions />} />;
}
