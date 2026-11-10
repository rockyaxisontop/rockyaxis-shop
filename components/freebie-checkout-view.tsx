"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gift, Loader2, LockKeyhole, PartyPopper, Sparkles, Users } from "lucide-react";

import { useAuth } from "@/components/providers";
import { useFreebieCampaigns } from "@/components/freebie-panel";
import { FreebieOrderButton } from "@/components/freebie-order-button";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeCart, type CartItem } from "@/lib/firebase/cart";
import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";
import { cn } from "@/lib/utils";

/** Freebie-only campaign setup and progress; paid retailer links stay on /checkout. */
export function FreebieCheckoutView() {
  const { user, loading } = useAuth();
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
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <Gift className="size-10 text-brand" />
        <h1 className="text-xl font-bold text-ink">Sign in to start a free campaign</h1>
        <p className="text-sm text-ink-soft">Invite friends to unlock a free order for an eligible item.</p>
        <Link
          href="/login?next=/freebie"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid size-9 place-items-center rounded-lg border border-border text-ink-soft transition hover:border-brand hover:text-brand"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Get items for free</h1>
          <p className="text-sm text-ink-soft">Share a campaign and unlock a free order with 15 verified referrals.</p>
        </div>
      </header>

      <div className="rounded-xl border border-brand/20 bg-brand-tint/70 px-4 py-3 text-sm text-ink-soft">
        Each campaign runs for 7 days. Every referral must come from a unique account with a verified email.
        No purchase is needed to help a friend.
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <Gift className="size-8 text-ink-soft" />
          <p className="text-sm text-ink-soft">Your cart is empty. Add an item before starting a campaign.</p>
          <Link href="/search" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">
            Browse products
          </Link>
        </div>
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
    </div>
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
  const active = campaign?.status === "active";
  const done = campaign?.status === "completed";
  const percent = campaign
    ? Math.min(100, Math.round((campaign.referralCount / campaign.target) * 100))
    : 0;

  return (
    <li className={cn("overflow-hidden rounded-2xl border bg-white shadow-sm", done ? "border-stock/40" : "border-border")}>
      <div className="flex items-center gap-3 p-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.title} className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          {item.brand ? (
            <p className="text-[10px] font-bold tracking-wider text-ink-soft uppercase">{item.brand}</p>
          ) : null}
          <p className="line-clamp-2 text-sm font-semibold text-ink">{item.title}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-xs text-ink-soft line-through">{formatPrice(item.price, item.currency)}</span>
            <span className="text-sm font-extrabold text-stock">FREE when unlocked</span>
          </p>
        </div>
      </div>

      {campaign ? (
        <div className="border-t border-border bg-brand-tint/40 px-4 py-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-ink">
              <Users className="size-3.5 text-brand" />
              {campaign.referralCount} / {campaign.target} verified referrals
            </span>
            <span className={done ? "text-stock" : "text-ink-soft"}>
              {done ? "Unlocked" : active ? `${campaign.target - campaign.referralCount} to go` : "Campaign ended"}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className={cn("h-full rounded-full transition-all", done ? "bg-stock" : "bg-brand")}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="border-t border-border p-3 sm:p-4">
        {done && campaign ? (
          <>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-stock">
              <PartyPopper className="size-3.5" />
              Your referral goal is complete.
            </p>
            <FreebieOrderButton campaign={campaign} />
          </>
        ) : active && campaign ? (
          <Link
            href={`/freebie/mine/${campaign.id}`}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:brightness-110"
          >
            <Sparkles className="size-4" />
            Continue campaign
          </Link>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : campaign ? <Gift className="size-4" /> : <LockKeyhole className="size-4" />}
            {busy ? "Starting campaign…" : campaign ? "Start a new campaign" : "Get it for FREE"}
          </button>
        )}
      </div>
    </li>
  );
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}
