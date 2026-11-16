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

import { useCurrency } from "@/components/currency-provider";
import { useAuth } from "@/components/providers";
import { addToCart } from "@/lib/firebase/cart";
import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";
import {
  campaignPercent,
  FreebieCountdown,
  FreebiePrice,
  FreebieSegments,
  FreebieSocialProof,
  FreebieStatusPill,
  formatCampaignMoney,
  spotsLeft,
} from "@/components/freebie-ui";
import { cn } from "@/lib/utils";

/** Landing page for an invited user: shows progress and counts their referral. */
export function FreebieClaim({ code }: { code: string }) {
  const { user, loading } = useAuth();
  const { currency } = useCurrency();
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
  // Campaign amounts are stored in USD; show them in the visitor's currency.
  const price = formatCampaignMoney(campaign.product.price, currency);
  // What the shopper pays at MT Store today — that is what going free is worth.
  const saved = price;
  const listPrice = campaign.product.listPrice
    ? formatCampaignMoney(campaign.product.listPrice, currency)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 py-3 sm:gap-4 sm:py-6">
      {/* Hero: the deal, the money at stake, the clock — all above the fold. */}
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl px-4 pt-4 pb-4 text-white sm:px-5",
          done
            ? "bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600"
            : "bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4]",
        )}
      >
        <span className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-14 -left-8 size-36 rounded-full border-[16px] border-white/10" />

        <div className="relative z-10 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase backdrop-blur">
            <Gift className="size-3" />
            Friend invite · freebie
          </span>
          <FreebieCountdown expiresAt={campaign.expiresAt} status={campaign.status} />
        </div>

        <h1 className="relative z-10 mt-2.5 text-xl leading-[1.15] font-extrabold tracking-tight text-balance sm:text-3xl">
          {done ? (
            <>🎉 This item is unlocked!</>
          ) : expired ? (
            <>This freebie has ended</>
          ) : (
            <>
              Help unlock this for <span className="text-[#ffdd48]">{saved}</span> off
            </>
          )}
        </h1>
        <p className="relative z-10 mt-1.5 max-w-sm text-xs leading-5 text-white/85 sm:text-sm">
          {done
            ? "The goal was reached — thanks to everyone who helped."
            : expired
              ? "Ask your friend to start a fresh campaign, then come back."
              : `Just ${remaining} verified ${remaining === 1 ? "person" : "people"} needed. Helping takes 10 seconds and costs nothing.`}
        </p>

        <div className="relative z-10 mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
          <div className="flex-1">
            <FreebieSegments count={campaign.referralCount} target={campaign.target} done={done} />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-white/90">
              <Users className="size-3.5" aria-hidden />
              {campaign.referralCount} of {campaign.target} joined
              <span className="ml-auto text-[#ffdd48]">{percent}%</span>
            </p>
          </div>
        </div>
      </section>

      {/* Product card: price → ₨0, savings badge, social proof. */}
      <section className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-24">
            {campaign.product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.product.image} alt="" className="size-full object-cover" />
            ) : null}
            <span className="absolute top-1.5 left-1.5 rounded-md bg-[#ffdd48] px-1.5 py-0.5 text-[9px] font-extrabold text-[#7a4a00] shadow">
              FREE
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm leading-snug font-bold text-ink sm:text-base">
                {campaign.product.title}
              </p>
              <FreebieStatusPill status={done ? "completed" : campaign.status} className="shrink-0" />
            </div>
            {campaign.product.brand ? (
              <p className="mt-0.5 truncate text-[10px] font-bold tracking-wider text-ink-soft uppercase">
                {campaign.product.brand}
              </p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <FreebiePrice
                price={campaign.product.price}
                listPrice={campaign.product.listPrice}
                currency={currency}
              />
              <span className="text-lg font-extrabold text-stock">FREE</span>
              <span className="rounded-full bg-stock-bg px-2 py-0.5 text-[10px] font-extrabold text-stock">
                You save {saved}
              </span>
              {listPrice ? (
                <span className="rounded-full bg-save px-1.5 py-0.5 text-[10px] font-extrabold text-ink">
                  {campaign.product.discountPercent ?? 80}% off list
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
          <FreebieSocialProof count={campaign.referralCount} target={campaign.target} />
          <Link
            href={`/products/${campaign.product.productId}`}
            className="shrink-0 text-[11px] font-bold text-brand hover:underline"
          >
            Details
          </Link>
        </div>
      </section>

      {/* Action: single primary CTA per state. */}
      <section className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
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
                Now get {saved} worth of stuff for free yourself
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
            <p className="mt-2 text-xs text-ink-soft">Want your own free {price} item? Start a campaign in seconds.</p>
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
              Why help for nothing? Get {saved} back
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
