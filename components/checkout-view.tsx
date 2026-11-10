"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Gift, Loader2, LockKeyhole, ShoppingBag } from "lucide-react";

import { useAuth } from "@/components/providers";
import { Skeleton } from "@/components/ui/skeleton";
import { readJsonResponse } from "@/lib/client-api";
import { subscribeCart, type CartItem } from "@/lib/firebase/cart";

type Campaign = {
  id: string;
  productId: string;
  product: { title: string; image?: string | null; brand?: string | null };
  target: number;
  referralCount: number;
  status: string;
  expiresAt: string;
  isOwner: boolean;
};

type CheckoutViewProps = {
  mode: "pay" | "free";
  campaignId?: string;
};

export function CheckoutView({ mode, campaignId }: CheckoutViewProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(Boolean(campaignId));
  const [pendingProduct, setPendingProduct] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/checkout?mode=${mode}${campaignId ? `&campaignId=${campaignId}` : ""}`)}`);
      return;
    }
    return subscribeCart(user.uid, (next) => {
      setItems(next);
      setCartReady(true);
    });
  }, [campaignId, loading, mode, router, user]);

  useEffect(() => {
    if (!user || !campaignId) return;
    let active = true;
    setCampaignLoading(true);
    void user.getIdToken().then((token) => fetch(`/api/freebies/campaigns/${encodeURIComponent(campaignId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).then(async (response) => {
      const body = await readJsonResponse<{ campaign?: Campaign; error?: string }>(response);
      if (!response.ok) throw new Error(body.error ?? "Could not load this campaign.");
      if (active) setCampaign(body.campaign ?? null);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load this campaign.");
    }).finally(() => {
      if (active) setCampaignLoading(false);
    });
    return () => {
      active = false;
    };
  }, [campaignId, user]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const currency = items[0]?.currency ?? "USD";
  const isFreeOrderReady = Boolean(
    campaignId && campaign?.isOwner && campaign?.status === "complete" && campaign.referralCount >= campaign.target,
  );

  async function startCampaign(item: CartItem) {
    if (!user) return;
    setPendingProduct(item.productId);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/freebies/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: item.productId }),
      });
      const body = await readJsonResponse<{ campaign?: Campaign; error?: string }>(response);
      if (!response.ok || !body.campaign) throw new Error(body.error ?? "Could not start this campaign.");
      router.push(`/freebie/${encodeURIComponent(body.campaign.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start this campaign.");
    } finally {
      setPendingProduct("");
    }
  }

  async function placeFreeOrder() {
    if (!user || !campaignId) return;
    setPlacingOrder(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/freebies/campaigns/${encodeURIComponent(campaignId)}/order`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await readJsonResponse<{ orderId?: string; error?: string }>(response);
      if (!response.ok || !body.orderId) throw new Error(body.error ?? "Could not place this order.");
      router.push(`/order-confirmation/${encodeURIComponent(body.orderId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not place this order.");
    } finally {
      setPlacingOrder(false);
    }
  }

  if (loading || !cartReady || campaignLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!user) return null;

  const title = mode === "pay" ? "Review your order" : campaignId ? "Order Now Free" : "Choose a product to get for FREE";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-5 sm:py-8">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {mode === "pay"
              ? "Your payment is completed securely at each retailer."
              : campaignId
                ? "Only the selected campaign product is included in this free order."
                : "Choose one item from your cart to start its own 15-person referral campaign."}
          </p>
        </div>
        <Link href="/cart" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
          <ArrowLeft className="size-4" />
          Cart
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-white px-5 py-12 text-center">
          <ShoppingBag className="mx-auto size-8 text-ink-soft" />
          <h2 className="mt-3 text-base font-semibold text-ink">Your cart is empty</h2>
          <Link href="/search" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Browse products</Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-white">
            {items.map((item) => {
              const isSelectedCampaignProduct = Boolean(campaign && item.productId === campaign.productId);
              return (
                <li key={`${item.productId}-${JSON.stringify(item.options ?? {})}`} className="flex min-w-0 items-center gap-3 p-3 sm:gap-4 sm:p-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-md bg-surface-2 sm:size-20">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="size-full object-contain" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${encodeURIComponent(item.productId)}`} className="line-clamp-2 text-sm font-semibold text-ink hover:underline">{item.title}</Link>
                    {item.brand ? <p className="mt-0.5 text-xs text-ink-soft">{item.brand}</p> : null}
                    <p className="mt-1 text-sm font-medium text-ink">
                      {mode === "free" && isSelectedCampaignProduct ? "NPR 0" : `${formatPrice(item.price, item.currency)} × ${item.quantity}`}
                    </p>
                  </div>
                  {mode === "pay" ? (
                    item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark">
                        Pay Now <ExternalLink className="size-3.5" />
                      </a>
                    ) : <span className="text-right text-xs text-ink-soft">Store link unavailable</span>
                  ) : !campaignId ? (
                    <button
                      type="button"
                      disabled={pendingProduct === item.productId}
                      onClick={() => void startCampaign(item)}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-brand px-3 text-xs font-semibold text-brand hover:bg-brand-tint disabled:opacity-60"
                    >
                      {pendingProduct === item.productId ? <Loader2 className="size-3.5 animate-spin" /> : <Gift className="size-3.5" />}
                      Get It for FREE
                    </button>
                  ) : isSelectedCampaignProduct ? (
                    <span className="rounded-full bg-stock-bg px-2.5 py-1 text-xs font-semibold text-stock">Campaign product</span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {mode === "pay" ? (
            <aside className="ml-auto w-full max-w-sm rounded-lg border border-border bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">Subtotal</span>
                <strong className="text-ink">{formatPrice(total, currency)}</strong>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-soft">Continue to each retailer to complete payment and delivery.</p>
              <LockKeyhole className="mt-3 size-4 text-ink-soft" aria-hidden />
            </aside>
          ) : !campaignId ? (
            <p className="rounded-md bg-brand-tint p-3 text-sm leading-5 text-ink-soft">
              Each product has its own 7-day campaign. Invite 15 newly registered, email-verified users to unlock one item.
            </p>
          ) : (
            <aside className="ml-auto w-full max-w-sm rounded-lg border border-border bg-white p-4 sm:p-5">
              {error ? <p role="alert" className="mb-3 text-sm text-destructive">{error}</p> : null}
              {isFreeOrderReady ? (
                <>
                  <p className="text-sm font-semibold text-stock">15 referrals verified. This product is free.</p>
                  <button type="button" disabled={placingOrder} onClick={() => void placeFreeOrder()} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                    {placingOrder ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
                    {placingOrder ? "Placing order…" : "Order Now Free"}
                  </button>
                </>
              ) : (
                <p className="text-sm text-ink-soft">Complete the campaign’s 15 verified referrals before placing a free order.</p>
              )}
            </aside>
          )}
          {error && !campaignId ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </>
      )}
    </div>
  );
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}