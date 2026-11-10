"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  LockKeyhole,
  PartyPopper,
  Share2,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/providers";
import { useFreebieCampaigns } from "@/components/freebie-panel";
import { FreebieOrderButton } from "@/components/freebie-order-button";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeCart, type CartItem } from "@/lib/firebase/cart";
import { freebieApi } from "@/lib/freebies/client";
import type { PublicCampaign } from "@/lib/freebies/types";
import { cn } from "@/lib/utils";

/**
 * Checkout: every cart product gets two choices —
 *   "Get it free" (start/continue a referral campaign) or "Buy now" (retailer).
 */
export function CheckoutView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const { campaigns, upsert } = useFreebieCampaigns(Boolean(user));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setReady(false);
      return;
    }
    return subscribeCart(user.uid, (next) => {
      setItems(next);
      setReady(true);
    });
  }, [user]);

  async function startFree(productId: string) {
    setBusyId(productId);
    setError(null);
    try {
      const { campaign } = await freebieApi.startCampaign(productId);
      upsert(campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the campaign.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !ready) {
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
        <ShoppingBag className="size-10 text-ink-soft" />
        <h1 className="text-xl font-bold text-ink">Sign in to check out</h1>
        <Link
          href="/login?next=/checkout"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid size-9 place-items-center rounded-lg border border-border text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Checkout</h1>
          <p className="text-sm text-ink-soft">Pay normally, or get it free by inviting friends.</p>
        </div>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <ShoppingBag className="size-8 text-ink-soft" />
          <p className="text-sm text-ink-soft">Your cart is empty.</p>
          <Link href="/search" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <CheckoutItem
              key={item.productId}
              item={item}
              campaign={campaigns[item.productId]}
              busy={busyId === item.productId}
              onStartFree={() => startFree(item.productId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckoutItem({
  item,
  campaign,
  busy,
  onStartFree,
}: {
  item: CartItem;
  campaign: PublicCampaign | undefined;
  busy: boolean;
  onStartFree: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const done = campaign?.status === "completed";
  const active = campaign?.status === "active";
  const percent = campaign ? Math.min(100, Math.round((campaign.referralCount / campaign.target) * 100)) : 0;
  const link =
    campaign && typeof window !== "undefined"
      ? `${window.location.origin}/freebie/${campaign.code}`
      : "";

  async function copy() {
    await navigator.clipboard.writeText(link).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border bg-white",
        done ? "border-stock/50" : "border-border",
      )}
    >
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-24">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.title} className="size-full object-cover" />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {item.brand ? (
            <p className="text-[10px] font-bold tracking-wider text-ink-soft uppercase">{item.brand}</p>
          ) : null}
          <p className="line-clamp-2 text-sm leading-snug font-semibold text-ink">{item.title}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-bold text-ink">
              {formatPrice(item.price, item.currency)}
            </span>
            <span className="text-[11px] text-ink-soft">× {item.quantity}</span>
          </p>
        </div>
      </div>

      {/* Freebie progress */}
      {active && campaign ? (
        <div className="border-t border-border bg-brand-tint/60 px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-ink">
              <Users className="size-3.5 text-brand" />
              {campaign.referralCount}/{campaign.target} friends joined
            </span>
            <span className="text-brand">{campaign.target - campaign.referralCount} to go</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-[#2da9d6] transition-all"
              style={{ width: `${Math.max(percent, 3)}%` }}
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white text-[11px] font-semibold text-ink hover:border-brand hover:text-brand"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              href={`/freebie/mine/${campaign.id}`}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand text-[11px] font-bold text-white"
            >
              <Share2 className="size-3.5" />
              Share
            </Link>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:p-4">
        {done ? (
          <div className="flex-1">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-stock">
              <PartyPopper className="size-3.5" />
              Unlocked — pay nothing
            </p>
            <FreebieOrderButton campaign={campaign!} />
          </div>
        ) : active ? (
          <div className="flex flex-1 flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Sparkles className="size-3.5 text-brand" />
              Campaign running — {campaign.target - campaign.referralCount} more verified referrals to unlock.
            </p>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-bold text-ink-soft"
            >
              <LockKeyhole className="size-4" />
              Order Now — unlock at {campaign.target} referrals
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartFree}
            disabled={busy}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
            Get it for FREE
          </button>
        )}

        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-ink transition hover:border-brand hover:text-brand"
          >
            <ShoppingBag className="size-4" />
            Buy now
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}
