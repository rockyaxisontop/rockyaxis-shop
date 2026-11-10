"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PartyPopper } from "lucide-react";

import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";

/** "Order Now" for an unlocked (completed) campaign — places the NPR 0 order. */
export function FreebieOrderButton({ campaign }: { campaign: PublicCampaign }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function order() {
    setBusy(true);
    setError(null);
    try {
      const { order } = await freebieApi.placeOrder(campaign.id);
      router.push(`/freebie/order/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't place the order.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={order}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-stock px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <PartyPopper className="size-3.5" />}
        Order Now — Free
      </button>
      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
