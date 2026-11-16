"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Gift,
  Loader2,
  LogIn,
  PartyPopper,
  Share2,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/providers";
import { addToCart } from "@/lib/firebase/cart";
import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";
import {
  campaignPercent,
  FreebieCountdown,
  FreebieSegments,
  FreebieStatusPill,
  spotsLeft,
} from "@/components/freebie-ui";
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
    if (!user || !campaign) return;
    setStarting(true);
    setMessage(null);
    try {
      const { campaign: mine } = await freebieApi.startFromCode(code);

      // Put the product in their cart so it's waiting for them at checkout.
      // Cart prices are the ORIGINAL USD list price: every cart screen applies
      // the 80% discount once, so passing our discounted price here would
      // discount it a second time.
      await addToCart(user.uid, {
        productId: campaign.product.productId,
        title: campaign.product.title,
        image: campaign.product.image,
        brand: campaign.product.brand,
        price: campaign.product.listPrice ?? campaign.product.price,
        currency: campaign.product.currency,
        url: campaign.product.url,
      }).catch(() => { });

      router.push(`/freebie/mine/${mine.id}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't start your campaign.");
      setStarting(false);
    }
  }

  if (loading || state === "loading") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-3 py-6">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-14 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (state === "error" || !campaign) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
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

  const percent = campaignPercent(campaign.referralCount, campaign.target);
  const done = campaign.status === "completed";
  const expired = campaign.status === "expired" || campaign.status === "cancelled";
  const remaining = spotsLeft(campaign.referralCount, campaign.target);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 py-2 sm:gap-4 sm:py-6">
      {/* One card carries everything that matters: what it is, what it costs,
          how far along it is, and the action — all readable without scrolling. */}
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div
          className={cn(
            "relative overflow-hidden px-4 pt-3 pb-3.5 text-white sm:px-5 sm:pt-4",
            done
              ? "bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600"
              : "bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4]",
          )}
        >
          <span className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-white/10" />

          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase backdrop-blur">
              <Gift className="size-3" />
              Freebie invite
            </span>
            <FreebieCountdown expiresAt={campaign.expiresAt} status={campaign.status} />
          </div>

          <h1 className="relative z-10 mt-2 text-lg leading-[1.15] font-extrabold tracking-tight text-balance sm:text-2xl">
            {done ? (
              <>🎉 This item is unlocked!</>
            ) : expired ? (
              <>This freebie has ended</>
            ) : (
              <>
                Help unlock this — <span className="text-[#ffdd48]">FREE</span>
              </>
            )}
          </h1>

          <div className="relative z-10 mt-2 flex items-stretch gap-2.5">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/10 sm:size-20">
              {campaign.product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={campaign.product.image} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <p className="line-clamp-2 text-[13px] leading-snug font-bold sm:text-sm">
                {campaign.product.title}
              </p>
              {campaign.product.brand ? (
                <p className="mt-0.5 truncate text-[10px] font-bold tracking-wider text-white/60 uppercase">
                  {campaign.product.brand}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-black tracking-tight text-[#ffdd48]">FREE</span>
                <span className="rounded bg-[#ffdd48] px-1.5 py-0.5 text-[10px] font-extrabold text-[#7a4a00]">
                  0
                </span>
                <FreebieStatusPill
                  status={done ? "completed" : campaign.status}
                  className="shrink-0 bg-white/20 text-white"
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-2.5 rounded-xl bg-white/10 px-2.5 py-1.5 backdrop-blur">
            <FreebieSegments count={campaign.referralCount} target={campaign.target} done={done} />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-white/90">
              <Users className="size-3.5" aria-hidden />
              {campaign.referralCount} of {campaign.target} joined
              <span className="ml-auto text-[#ffdd48]">{percent}%</span>
            </p>
          </div>
        </div>

        <p className="px-4 pt-2.5 text-[11px] leading-4 font-semibold text-ink-soft">
          {done
            ? "Goal reached — nothing left to do. Thanks to everyone who helped."
            : expired
              ? "This campaign ended. Start your own for this item in one tap."
              : `${remaining} more verified ${remaining === 1 ? "person" : "people"} needed. Helping takes 10 seconds and costs nothing.`}
        </p>

        {/* Action sits directly under the progress, so it is never a scroll away. */}
        <div className="p-3 pt-0 sm:p-4 sm:pt-0">
          {!user ? (
          <>
            <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-ink-soft">
              <LogIn className="size-3.5" />
              Sign in to count your name — takes 10 seconds
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(238,56,94,0.3)] transition hover:brightness-110 active:scale-[0.99]"
            >
              <Gift className="size-4" />
              Claim my spot — free
              <ArrowRight className="size-4" />
            </Link>
            <p className="mt-2 flex items-center justify-center gap-1 text-[10px] font-medium text-ink-soft">
              <BadgeCheck className="size-3 text-stock" />
              No payment · no purchase · verified email only
            </p>
          </>
        ) : campaign.isSelf ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-ink">This is your own campaign.</p>
            <p className="mt-0.5 text-xs text-ink-soft">Track progress and share your link.</p>
            <Link
              href={`/freebie/mine/${campaign.id}`}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white transition hover:brightness-110"
            >
              <Share2 className="size-4" />
              Share your link
            </Link>
          </div>
        ) : campaign.alreadyReferred ? (
          <div>
            <p className="flex items-center justify-center gap-2 rounded-lg bg-stock-bg px-3 py-2 text-sm font-semibold text-stock">
              <CheckCircle2 className="size-4" />
              {message?.includes("counted") ? "Thanks — your referral is counted!" : "You've already helped here"}
            </p>
            <div className="mt-2.5 rounded-xl border border-[#f36d25]/25 bg-[#fff6ef] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#b34a12]">
                <TrendingUp className="size-3.5" />
                Now get your own items for free
              </p>
              <p className="mt-1 text-[11px] leading-4 text-ink-soft">
                Same product, same rules. Start in one tap — it&apos;s already in your cart.
              </p>
            </div>
            <button
              type="button"
              onClick={startMine}
              disabled={starting}
              className="mt-2.5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(238,56,94,0.3)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {starting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Get mine for FREE too
              <ArrowRight className="size-4" />
            </button>
            <Link
              href="/"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-ink-soft transition hover:text-brand"
            >
              <ShoppingBag className="size-3.5" />
              Keep browsing the store
            </Link>
          </div>
        ) : done ? (
          <div className="text-center">
            <p className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stock-bg px-3 py-2.5 text-sm font-semibold text-stock">
              <PartyPopper className="size-4" />
              Goal reached — nothing left to do
            </p>
            <p className="mt-2 text-xs text-ink-soft">Want your own free item? Start a campaign in seconds.</p>
            <button
              type="button"
              onClick={startMine}
              disabled={starting}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {starting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Get mine for free too
            </button>
            <Link
              href="/"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              <ShoppingBag className="size-3.5" />
              Explore the store
            </Link>
          </div>
        ) : expired ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-ink">This campaign ended</p>
            <p className="mt-0.5 text-xs text-ink-soft">Start your own for this product — 7 fresh days.</p>
            <button
              type="button"
              onClick={startMine}
              disabled={starting}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {starting ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
              Start my free campaign
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={claim}
              disabled={claiming}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(238,56,94,0.3)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {claiming ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
              Count my free referral
              <ArrowRight className="size-4" />
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-[10px] font-medium text-ink-soft">
              <BadgeCheck className="size-3 text-stock" />
              No payment · no purchase · verified email only
            </p>
          </>
        )}

          {message && !campaign.alreadyReferred && !done ? (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-ink-soft">
              <Check className="size-3.5 text-stock" />
              {message}
            </p>
          ) : null}
        </div>
      </section>

      {/* Growth loop: turn a helper into an owner immediately. */}
      {!done && !expired && !campaign.alreadyReferred && !campaign.isSelf ? (
        <Link
          href={user ? "/freebie" : "/login?next=/freebie"}
          className="flex items-center gap-2.5 rounded-2xl border border-[#f36d25]/25 bg-[#fff6ef] px-3 py-2.5 transition hover:border-[#f36d25]/50"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ffe4d1] text-[#c14b0f]">
            <TrendingUp className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-[#b34a12]">
              Why help for nothing? Get yours for free
            </span>
            <span className="block text-[11px] leading-4 text-ink-soft">
              Start your own campaign and unlock the same item free.
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-[#c14b0f]" />
        </Link>
      ) : null}
    </div>
  );
}
