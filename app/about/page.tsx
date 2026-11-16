import type { Metadata } from "next";

import { AboutContent } from "@/components/about-content";

export const metadata: Metadata = {
  title: "About MT Store",
  description: "Learn how MT Store helps you discover products and compare offers from online stores.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutContent />;
}
