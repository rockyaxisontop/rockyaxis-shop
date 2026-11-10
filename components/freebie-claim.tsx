"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Gift, Loader2, LogIn, PartyPopper } from "lucide-react";

import { useAuth } from "@/components/providers";
import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";

/** Landing page for an invited user: shows progress and counts their referral. */
export function FreebieClaim({ code }: { code: string }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    try {
      const { campaign: found } = await freebieApi.getCampaign(code);
      setCampaign(found);
      setState("ready");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "This link isn't valid.");
      setState("error");
    }
  }, [code]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setState("ready");
      return;
    }
    void load();
  }, [loading, user, load]);

  async function claim() {
    setClaiming(true);
    setMessage(null);
    try {
      const result = await freebieApi.claim(code);
      setCampaign(result.campaign);
      setMessage(
        result.counted
          ? "Thanks! Your referral was counted."
          : (result.reason ?? "You've already helped with this one."),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't count your referral.");
    } finally {
      setClaiming(false);
    }
  }

  if (loading || state === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  if (state === "error" || !campaign) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <Gift className="size-10 text-ink-soft" />
        <h1 className="text-xl font-bold text-ink">This referral link isn&apos;t valid</h1>
        <p className="text-sm text-ink-soft">{message ?? "Ask your friend for a new link."}</p>
        <Link href="/" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">
          Go to shop
        </Link>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((campaign.referralCount / campaign.target) * 100));
  const done = campaign.status === "completed";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 py-8">
      <div className="rounded-2xl border border-border bg-white p-5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-[11px] font-bold text-brand">
          <Gift className="size-3.5" />
          Freebie referral
        </span>

        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-ink">
          Help a friend get this for free
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {campaign.target} people needed. Every verified account counts once.
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-border p-3 text-left">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
            {campaign.product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.product.image} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold text-ink">{campaign.product.title}</p>
            <p className="text-xs text-ink-soft line-through">
              {new Intl.NumberFormat("en", {
                style: "currency",
                currency: campaign.product.currency,
              }).format(campaign.product.price)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
            <span>{campaign.referralCount} referrals</span>
            <span>{campaign.target} needed</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={done ? "h-full bg-stock" : "h-full bg-brand"}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="mt-5">
          {!user ? (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white"
            >
              <LogIn className="size-4" />
              Sign in to count your referral
            </Link>
          ) : campaign.isSelf ? (
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-ink-soft">
              This is your own campaign — share the link with friends instead.
            </p>
          ) : campaign.alreadyReferred ? (
            <p className="inline-flex items-center gap-2 rounded-lg bg-stock-bg p-3 text-sm font-semibold text-stock">
              <Check className="size-4" />
              You&apos;ve already helped with this one.
            </p>
          ) : done ? (
            <p className="inline-flex items-center gap-2 rounded-lg bg-stock-bg p-3 text-sm font-semibold text-stock">
              <PartyPopper className="size-4" />
              This product is already unlocked!
            </p>
          ) : (
            <button
              type="button"
              onClick={claim}
              disabled={claiming}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white disabled:opacity-60"
            >
              {claiming ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
              Count my referral
            </button>
          )}
        </div>

        {message ? <p className="mt-3 text-sm text-ink-soft">{message}</p> : null}
      </div>
    </div>
  );
}
