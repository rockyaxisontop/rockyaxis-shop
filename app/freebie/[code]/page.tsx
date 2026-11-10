import type { Metadata } from "next";

import { FreebieClaim } from "@/components/freebie-claim";

export const metadata: Metadata = { title: "Freebie referral" };

export default async function FreebiePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <FreebieClaim code={code} />;
}
