import type { Metadata } from "next";

import { FreebieMine } from "@/components/freebie-mine";

export const metadata: Metadata = { title: "Your freebie campaign" };

export default async function FreebieMinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FreebieMine campaignId={id} />;
}
