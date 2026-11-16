"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Flame,
  Gift,
  Loader2,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";

import { useCurrency } from "@/components/currency-provider";
import { useAuth } from "@/components/providers";
import { useFreebieCampaigns } from "@/components/freebie-panel";
import { FreebieOrderButton } from "@/components/freebie-order-button";
import {
  campaignPercent,
  FreebieCountdown,
  FreebiePrice,
  FreebieSegments,
  FreebieStatusPill,
  formatMoney,
  spotsLeft,
} from "@/components/freebie-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { STORE_DISCOUNT_PERCENT, storeLineTotal, storeListPrice } from "@/lib/discount";
import { subscribeCart, type CartItem } from "@/lib/firebase/cart";
import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";
import { cn } from "@/lib/utils";

/** Freebie-only campaign setup and progress; paid retailer links stay on /checkout. */
export function FreebieCheckoutView() {
  const { user, loading } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { campaigns, loading: campaignsLoading, upsert } = useFreebieCampaigns(Boolean(user));

  useEffect(() => {
    if (!user) {
      setItems([]);
      setCartReady(false);
      return;
    }
    return subscribeCart(user.uid, (next) => {
      setItems(next);
      setCartReady(true);
    });
  }, [user]);

  async function startCampaign(productId: string) {
    setBusyId(productId);
    setError(null);
    try {
      const { campaign } = await freebieApi.startCampaign(productId);
      upsert(campaign);
      router.push(`/freebie/mine/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start your free campaign.");
      setBusyId(null);
    }
  }

  if (loading || (user && (!cartReady || campaignsLoading))) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return <SignedOutHero />;
  }

  // Cart rows hold the USD list price; the hero quotes what the shopper would
  // actually pay us for these items (80% off), in their own currency.
  const totalValue = items.reduce(
    (sum, item) => sum + storeLineTotal(item.price ?? 0, item.quantity ?? 1, currency),
    0,
  );
  const listValue = items.reduce(
    (sum, item) => sum + storeListPrice(item.price ?? 0, currency) * (item.quantity ?? 1),
    0,
  );
  const unlocked = items.filter((item) => campaigns[item.productId]?.status === "completed").length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <FreebieHero
        totalValue={totalValue}
        listValue={listValue}
        currency={currency}
        unlocked={unlocked}
        count={items.length}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <FreebieItem
              key={item.productId}
              item={item}
              campaign={campaigns[item.productId]}
              busy={busyId === item.productId}
              onStart={() => startCampaign(item.productId)}
            />
          ))}
        </ul>
      )}

      <HowItWorks />
    </div>
  );
}

/** Above-the-fold pitch: shows the money at stake and the 3 steps in one glance. */
function FreebieHero({
  totalValue,
  listValue,
  currency,
  unlocked,
  count,
}: {
  totalValue: number;
  listValue: number;
  currency: string;
  unlocked: number;
  count: number;
}) {
  const hasItems = count > 0;
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4] px-4 py-4 text-white sm:px-6 sm:py-5">
      <span className="pointer-events-none absolute -top-12 -right-10 size-36 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full border-[18px] border-white/10" />

      <div className="relative z-10 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
          <Gift className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold tracking-[0.14em] text-white/70 uppercase">
            Freebie · pay nothing
          </p>
          <h1 className="mt-0.5 text-lg leading-tight font-extrabold tracking-tight text-balance sm:text-2xl">
            Get your cart item for <span className="text-[#ffdd48]">FREE</span>
          </h1>
          {hasItems ? (
            <p className="mt-1 text-xs leading-5 text-white/80 sm:text-sm">
              You&apos;re about to save{" "}
              <span className="font-extrabold text-white">{formatMoney(totalValue, currency)}</span>
              {listValue > totalValue ? (
                <>
                  {" "}
                  <span className="text-white/60 line-through">
                    {formatMoney(listValue, currency)}
                  </span>{" "}
                  <span className="rounded bg-[#ffdd48] px-1 py-0.5 text-[10px] font-extrabold text-[#7a4a00]">
                    {STORE_DISCOUNT_PERCENT}% OFF
                  </span>
                </>
              ) : null}
              . Invite <span className="font-extrabold text-white">15 verified friends</span> in 7 days —
              no purchase needed.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-white/80 sm:text-sm">
              Pick any product, invite 15 verified friends in 7 days, and pay ₨0 at checkout.
            </p>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
        <HeroStep icon={Gift} label="Add to cart" done />
        <HeroStep icon={Users} label="Invite 15" done={unlocked > 0} />
        <HeroStep icon={Sparkles} label="Pay ₨0" done={false} />
      </div>
    </section>
  );
}

function HeroStep({
  icon: Icon,
  label,
  done,
}: {
  icon: typeof Gift;
  label: string;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold sm:text-[11px]",
        done ? "bg-white/20 text-white" : "bg-white/10 text-white/75",
      )}
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full",
          done ? "bg-[#3ddc97] text-[#04372a]" : "bg-white/25",
        )}
      >
        {done ? <Check className="size-2.5" strokeWidth={3} /> : <Icon className="size-2.5" />}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function SignedOutHero() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4] px-5 py-6 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffdd48] px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#7a4a00] uppercase">
          <Flame className="size-3" /> 100% free · 15 friends
        </span>
        <h1 className="mt-3 text-2xl leading-tight font-extrabold tracking-tight text-balance">
          Your cart, for <span className="text-[#ffdd48]">₨0</span>
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/85">
          Invite 15 verified friends within 7 days and your product ships free. No purchase needed to help.
        </p>
        <Link
          href="/login?next=/freebie"
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-extrabold text-[#011627] transition hover:bg-white/90"
        >
          Sign in to start
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <ul className="grid grid-cols-3 gap-2">
        <QuickFact icon={Users} title="15 friends" sub="counts once each" />
        <QuickFact icon={Timer} title="7 days" sub="then resets" />
        <QuickFact icon={ShieldCheck} title="₨0 order" sub="when unlocked" />
      </ul>
    </div>
  );
}

function QuickFact({ icon: Icon, title, sub }: { icon: typeof Gift; title: string; sub: string }) {
  return (
    <li className="flex flex-col items-center gap-1 rounded-xl border border-border bg-white px-2 py-3 text-center">
      <Icon className="size-4 text-brand" aria-hidden />
      <span className="text-xs font-extrabold text-ink">{title}</span>
      <span className="text-[10px] leading-3 text-ink-soft">{sub}</span>
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-5 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-tint text-brand">
        <Gift className="size-6" />
      </span>
      <div>
        <p className="text-sm font-bold text-ink">Your cart is empty</p>
        <p className="mt-0.5 text-xs text-ink-soft">Add a product first, then unlock it for free.</p>
      </div>
      <Link
        href="/search"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:brightness-110"
      >
        <Search className="size-4" />
        Browse products
      </Link>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="rounded-2xl border border-brand/15 bg-brand-tint/50 px-4 py-3">
      <h2 className="text-xs font-extrabold tracking-wide text-ink uppercase">How it works</h2>
      <ol className="mt-2 space-y-1.5 text-xs leading-5 text-ink-soft">
        <li className="flex gap-2">
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand text-[9px] font-extrabold text-white">1</span>
          Start a campaign on any cart item — takes one tap.
        </li>
        <li className="flex gap-2">
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand text-[9px] font-extrabold text-white">2</span>
          Share your link. Friends only sign in — no purchase.
        </li>
        <li className="flex gap-2">
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand text-[9px] font-extrabold text-white">3</span>
          At 15 verified referrals, your order unlocks at ₨0.
        </li>
      </ol>
    </section>
  );
}

function FreebieItem({
  item,
  campaign,
  busy,
  onStart,
}: {
  item: CartItem;
  campaign: PublicCampaign | undefined;
  busy: boolean;
  onStart: () => void;
}) {
  const { currency } = useCurrency();
  const active = campaign?.status === "active";
  const done = campaign?.status === "completed";
  const percent = campaign ? campaignPercent(campaign.referralCount, campaign.target) : 0;
  const left = campaign ? spotsLeft(campaign.referralCount, campaign.target) : 0;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        done ? "border-stock/40" : active ? "border-brand/35" : "border-border",
      )}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-20">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.title} className="size-full object-cover" />
          ) : null}
          <span className="absolute top-1 left-1 rounded-md bg-[#3ddc97] px-1.5 py-0.5 text-[9px] font-extrabold text-[#04372a] shadow">
            FREE
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink sm:text-sm">
              {item.title}
            </p>
            {campaign ? <FreebieStatusPill status={campaign.status} className="shrink-0" /> : null}
          </div>
          {item.brand ? (
            <p className="mt-0.5 truncate text-[10px] font-bold tracking-wider text-ink-soft uppercase">
              {item.brand}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <FreebiePrice price={item.price} currency={currency} cartPrice />
            <span className="text-sm font-extrabold text-stock">FREE</span>
          </div>
        </div>
      </div>

      {campaign ? (
        <div className="border-t border-border bg-brand-tint/40 px-3 py-2.5 sm:px-4">
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-ink">
              <Users className="size-3.5 text-brand" aria-hidden />
              {campaign.referralCount}
              <span className="font-semibold text-ink-soft">/ {campaign.target} joined</span>
            </span>
            <span className={cn("shrink-0", done ? "text-stock" : left <= 3 && active ? "text-[#ee385e]" : "text-ink-soft")}>
              {done ? "Unlocked 🎉" : active ? `${left} to go` : "Ended"}
            </span>
          </div>
          <FreebieSegments count={campaign.referralCount} target={campaign.target} done={done} className="mt-1.5" />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-ink-soft">{percent}% complete</span>
            <FreebieCountdown expiresAt={campaign.expiresAt} status={campaign.status} className="text-ink-soft" />
          </div>
        </div>
      ) : null}

      <div className="p-2.5 sm:p-3">
        {done && campaign ? (
          <FreebieOrderButton campaign={campaign} />
        ) : active && campaign ? (
          <Link
            href={`/freebie/mine/${campaign.id}`}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99]"
          >
            <Share2 className="size-4" />
            Keep inviting — {left} to go
          </Link>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] px-4 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(238,56,94,0.28)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Gift className="size-4" />
            )}
            {busy ? "Starting…" : campaign ? "Try again for free" : "Get it for FREE"}
          </button>
        )}
      </div>
    </li>
  );
}
