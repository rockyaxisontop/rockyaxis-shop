"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, MapPin, PartyPopper } from "lucide-react";

import { useAuth } from "@/components/providers";
import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";
import { checkDeliveryProfile, missingDeliveryLabels, type RequiredDeliveryField } from "@/lib/profile";

/**
 * "Order Now" for an unlocked (completed) campaign.
 *
 * A free order still has to be delivered, so before placing it we check the
 * saved profile. If the delivery details are missing we prompt for them and send
 * the shopper to the profile page; if they're already saved we place the order
 * straight away, with no extra step.
 */
export function FreebieOrderButton({ campaign }: { campaign: PublicCampaign }) {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState<RequiredDeliveryField[] | null>(null);

  async function order() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/freebie/mine/${campaign.id}`)}`);
      return;
    }

    setBusy(true);
    setError(null);
    setNeedsProfile(null);

    try {
      // Only prompt when something required is genuinely missing.
      const { complete, missing } = await checkDeliveryProfile(user.uid);
      if (!complete) {
        setNeedsProfile(missing);
        setBusy(false);
        return;
      }

      const { order: placed } = await freebieApi.placeOrder(campaign.id);
      router.push(`/freebie/order/${placed.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't place the order.");
      setBusy(false);
    }
  }

  return (
    <div>
      {needsProfile ? (
        <div
          role="alert"
          className="mb-2.5 rounded-xl border border-[#f36d25]/30 bg-[#fff6ef] px-3 py-2.5"
        >
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#b34a12]">
            <MapPin className="size-3.5" />
            Add your delivery details first
          </p>
          <p className="mt-1 text-[11px] leading-4 text-ink-soft">
            We need these to deliver your free order:{" "}
            <span className="font-semibold text-ink">
              {missingDeliveryLabels(needsProfile).join(", ")}
            </span>
            .
          </p>
          <Link
            href={`/profile?next=${encodeURIComponent(`/freebie/mine/${campaign.id}`)}`}
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#f36d25] to-[#ee385e] text-xs font-extrabold text-white transition hover:brightness-110"
          >
            Complete my profile
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : null}

      <button
        type="button"
        onClick={order}
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stock px-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(4,120,87,0.3)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <PartyPopper className="size-4" />}
        {busy ? "Checking your details…" : "Order Now — FREE"}
      </button>
      {error ? <p className="mt-1.5 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
