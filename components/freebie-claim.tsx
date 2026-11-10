"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Gift,
  Loader2,
  LogIn,
  PartyPopper,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/providers";
import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";
import { cn } from "@/lib/utils";

/** Landing page for an invited user: shows progress and counts their referral. */
export function FreebieClaim({ code }: { code: string }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [starting, setStarting] = useState(false);

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

  // Always load — signed-out visitors must see the product before signing in.
  useEffect(() => {
    if (loading) return;
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

  async function startMine() {
    setStarting(true);
    setMessage(null);
    try {
      const { campaign: mine } = await freebieApi.startFromCode(code);
      router.push(`/freebie/mine/${mine.id}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't start your campaign.");
      setStarting(false);
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
        <span className="grid size-14 place-items-center rounded-full bg-surface-2">
          <Gift className="size-7 text-ink-soft" />
        </span>
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
  const expired = campaign.status === "expired";
  const remaining = Math.max(0, campaign.target - campaign.referralCount);
  const price = new Intl.NumberFormat("en", {
    style: "currency",
    currency: campaign.product.currency,
  }).format(campaign.product.price);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4] px-5 pt-6 pb-5 text-center text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur">
          <Gift className="size-3.5" />
          Freebie referral
        </span>
        <h1 className="mt-3 text-2xl leading-tight font-extrabold tracking-tight text-balance">
          {done ? "This product is unlocked!" : "Help a friend get this for free"}
        </h1>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-white/80">
          {done
            ? "The goal was reached — thanks to everyone who helped."
            : `${campaign.target} people needed. Each verified account counts once.`}
        </p>
        <span className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-white/10" />
      </div>

      {/* Product + progress */}
      <div className="rounded-2xl border border-border bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
            {campaign.product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.product.image} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm leading-snug font-semibold text-ink">
              {campaign.product.title}
            </p>
            {campaign.product.brand ? (
              <p className="mt-0.5 text-[11px] font-bold tracking-wider text-ink-soft uppercase">
                {campaign.product.brand}
              </p>
            ) : null}
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xs text-ink-soft line-through">{price}</span>
              <span className="text-sm font-extrabold text-stock">FREE</span>
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-ink">
              <Users className="size-3.5 text-brand" />
              {campaign.referralCount} of {campaign.target} joined
            </span>
            <span className={done ? "text-stock" : "text-ink-soft"}>
              {done ? "Complete" : `${remaining} to go`}
            </span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                done ? "bg-stock" : "bg-gradient-to-r from-brand to-[#2da9d6]",
              )}
              style={{ width: `${Math.max(percent, 3)}%` }}
            />
          </div>

          {/* Step dots — makes progress feel tangible */}
          <div className="mt-2 flex justify-between">
            {Array.from({ length: campaign.target }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full",
                  i < campaign.referralCount ? (done ? "bg-stock" : "bg-brand") : "bg-border",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="rounded-2xl border border-border bg-white p-4">
        {!user ? (
          <>
            <p className="mb-3 text-center text-sm text-ink-soft">
              Sign in to count your referral — it takes 10 seconds.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white transition hover:brightness-110"
            >
              <LogIn className="size-4" />
              Sign in to help
            </Link>
          </>
        ) : campaign.isSelf ? (
          <div className="text-center">
            <p className="text-sm text-ink-soft">This is your own campaign.</p>
            <Link
              href={`/freebie/mine/${campaign.id}`}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white"
            >
              <Share2 className="size-4" />
              Share your link
            </Link>
          </div>
        ) : campaign.alreadyReferred ? (
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-lg bg-stock-bg px-3 py-2 text-sm font-semibold text-stock">
              <CheckCircle2 className="size-4" />
              You&apos;ve already helped with this one
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              Want this product too? Start your own campaign — same rules, same chance.
            </p>
            <button
              type="button"
              onClick={startMine}
              disabled={starting}
              className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {starting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Get mine for free too
              <ArrowRight className="size-4" />
            </button>
          </div>
        ) : done ? (
          <p className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stock-bg px-3 py-3 text-sm font-semibold text-stock">
            <PartyPopper className="size-4" />
            This product is already unlocked!
          </p>
        ) : (
          <button
            type="button"
            onClick={claim}
            disabled={claiming}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {claiming ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
            Count my referral
          </button>
        )}

        {message ? (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-ink-soft">
            <Check className="size-3.5 text-stock" />
            {message}
          </p>
        ) : null}
      </div>

      {/* Growth loop for people who just helped */}
      {user && campaign.alreadyReferred && !campaign.isSelf ? (
        <p className="text-center text-xs text-ink-soft">
          Every friend you invite brings you closer to a free product.
        </p>
      ) : null}

      {expired ? (
        <p className="text-center text-xs text-ink-soft">
          This campaign has ended. Ask your friend to start a new one.
        </p>
      ) : null}
    </div>
  );
}
