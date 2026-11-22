"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Headphones,
  Home,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { useCurrency } from "@/components/currency-provider";
import {
  CartOrderStatus,
  CartOrderSummary,
  cartLineKey,
  useCartOrderState,
} from "@/components/messaging/cart-order-status";
import { useAuth } from "@/components/providers";
import { Skeleton } from "@/components/ui/skeleton";
import { STORE_DISCOUNT_PERCENT, storeLineTotal, storeListPrice, storePrice } from "@/lib/discount";
import { formatMoney } from "@/lib/format";
import { cartItemId, subscribeCart, type CartItem } from "@/lib/firebase/cart";

/** Orders are sent to MT Store's in-app chat so the team can confirm details. */
export function CheckoutView() {
  const { user, loading } = useAuth();
  const { currency, countryName, locationLabel } = useCurrency();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

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

  // One total, in the visitor's currency — cart prices are USD internally.
  const { orders: chatOrders, forLine } = useCartOrderState();

  const totals = useMemo(
    () => ({
      list: items.reduce(
        (sum, item) => sum + storeListPrice(item.price, currency) * item.quantity,
        0,
      ),
      pay: items.reduce(
        (sum, item) => sum + storeLineTotal(item.price, item.quantity, currency),
        0,
      ),
    }),
    [items, currency],
  );

  if (loading || (user && !ready)) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <ShoppingBag className="size-10 text-ink-soft" />
        <h1 className="text-xl font-bold text-ink">Sign in to continue</h1>
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
    <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:gap-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-white text-ink-soft transition hover:border-brand hover:text-brand"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <p className="text-xs font-bold tracking-widest text-brand uppercase">Order with MT Store</p>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Review your items</h1>
        </div>
      </header>

      <section className="flex items-start gap-3 rounded-2xl border border-[#128c7e]/20 bg-[#128c7e]/5 p-4 sm:items-center sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#128c7e] text-white">
          <MessageCircle className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-ink">Order right here in chat</h2>
          <p className="mt-1 text-xs leading-5 text-ink-soft sm:text-sm">
            Your order is sent to MT Store instantly. We confirm availability, delivery and the final
            price in the same conversation — no other apps needed.
          </p>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-white py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-surface-2">
            <ShoppingBag className="size-6 text-ink-soft" />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Your cart is empty</h2>
            <p className="mt-1 text-sm text-ink-soft">Find something you love and come back to order.</p>
          </div>
          <Link
            href="/search"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Shop now <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
          <section aria-labelledby="items-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="items-title" className="text-sm font-bold text-ink">
                Your items <span className="font-medium text-ink-soft">({items.length})</span>
              </h2>
              <Link href="/cart" className="text-xs font-semibold text-brand hover:underline">
                Edit cart
              </Link>
            </div>
            <CartOrderSummary orders={chatOrders} />
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li
                  key={cartItemId(item)}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-3 shadow-sm transition hover:border-brand/30 sm:flex-row sm:items-center sm:p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Link
                      href={`/products/${encodeURIComponent(item.productId)}${item.options ? `?${new URLSearchParams(item.options)}` : ""}`}
                      className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border/60 sm:size-24"
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.title} className="size-full object-cover" />
                      ) : null}
                    </Link>
                    <div className="min-w-0">
                      {item.brand ? (
                        <p className="text-[10px] font-bold tracking-wider text-ink-soft uppercase">
                          {item.brand}
                        </p>
                      ) : null}
                      <Link
                        href={`/products/${encodeURIComponent(item.productId)}${item.options ? `?${new URLSearchParams(item.options)}` : ""}`}
                        className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand"
                      >
                        {item.title}
                      </Link>
                      {item.options && Object.keys(item.options).length > 0 ? (
                        <p className="mt-1 line-clamp-1 text-[11px] text-ink-soft">
                          {Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(" · ")}
                        </p>
                      ) : null}
                      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="font-bold text-ink">
                          {formatMoney(storeLineTotal(item.price, item.quantity, currency), currency)}
                        </span>
                        <span className="text-xs text-ink-soft line-through">
                          {formatMoney(storeListPrice(item.price, currency) * item.quantity, currency)}
                        </span>
                        {item.quantity > 1 ? (
                          <span className="text-xs text-ink-soft">
                            {formatMoney(storePrice(item.price, currency), currency)} × {item.quantity}
                          </span>
                        ) : null}
                      </p>
                      {/* This row's order state, once it has been sent to the chat. */}
                      {(() => {
                        const order = forLine(cartLineKey(item.productId, item.options));
                        return order ? (
                          <div className="mt-1">
                            <CartOrderStatus status={order.status} />
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* The action reflects this row's order state:
                      - confirmed  → locked "Order success" (can't order twice)
                      - sent/awaiting payment → disabled "Order sent"
                      - no order   → "Buy this item" */}
                  {(() => {
                    const order = forLine(cartLineKey(item.productId, item.options));
                    if (order?.status === "confirmed") {
                      return (
                        <button
                          type="button"
                          disabled
                          aria-label={`${item.title} already ordered successfully`}
                          className="inline-flex h-11 w-full shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-stock-bg px-4 text-sm font-bold text-stock ring-1 ring-stock/40 sm:w-auto"
                        >
                          <CheckCircle2 className="size-4" />
                          Order success
                        </button>
                      );
                    }
                    if (order?.status === "awaiting_payment" || order?.status === "sent") {
                      return (
                        <button
                          type="button"
                          disabled
                          aria-label={`${item.title} order is being reviewed`}
                          className="inline-flex h-11 w-full shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-bold text-ink-soft ring-1 ring-border sm:w-auto"
                        >
                          <Clock3 className="size-4" />
                          Order sent
                        </button>
                      );
                    }
                    if (order?.status === "cancelled") {
                      return (
                        <button
                          type="button"
                          onClick={() => router.push(`/message?order=auto&item=${encodeURIComponent(cartItemId(item))}`)}
                          aria-label={`Order ${item.title} again in chat`}
                          className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-brand bg-white px-4 text-sm font-bold text-brand transition hover:bg-brand-tint sm:w-auto"
                        >
                          <ArrowRight className="size-4" />
                          Order again
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => router.push(`/message?order=auto&item=${encodeURIComponent(cartItemId(item))}`)}
                        aria-label={`Order ${item.title} in chat`}
                        className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto"
                      >
                        <MessageCircle className="size-4" />
                        Buy this item
                        <ArrowRight className="size-3.5" />
                      </button>
                    );
                  })()}
                </li>
              ))}
            </ul>
          </section>

          <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-bold text-ink">Order summary</h2>
              <p className="mt-1 text-xs text-ink-soft">
                {items.reduce((count, item) => count + item.quantity, 0)} items · confirm final details with our team
              </p>
              <dl className="mt-4 space-y-2 border-t border-border pt-3">
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-ink-soft">List price ({currency})</dt>
                  <dd className="text-ink-soft line-through">{formatMoney(totals.list, currency)}</dd>
                </div>
                <div className="flex justify-between gap-3 text-sm text-stock">
                  <dt>MT Store discount ({STORE_DISCOUNT_PERCENT}%)</dt>
                  <dd className="font-semibold">−{formatMoney(totals.list - totals.pay, currency)}</dd>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="font-semibold text-ink">Your total ({currency})</dt>
                  <dd className="font-bold text-ink">{formatMoney(totals.pay, currency)}</dd>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-ink-soft">Delivery</dt>
                  <dd className="text-right font-medium text-ink-soft">
                    Free across {countryName}
                    <span className="block text-[11px]">Ships from {locationLabel}</span>
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => router.push("/message?order=auto")}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <MessageCircle className="size-4" />
                Order now in chat
              </button>
              <p className="mt-2 text-center text-[11px] leading-5 text-ink-soft">
                Opens your chat with MT Store — your cart is sent automatically.
              </p>

              <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs text-ink-soft">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-stock" />
                  We’ll confirm your order before processing
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="size-4 text-brand" />
                  Delivery details confirmed by our team
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand" />
                  No payment is taken on this page
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-surface-2 p-4">
              <div className="flex items-start gap-3">
                <Headphones className="mt-0.5 size-4 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-ink">Need help first?</h2>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    Ask a question without sending an order.
                  </p>
                  <Link
                    href="/message"
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
                  >
                    <MessageCircle className="size-3.5" />
                    Chat with us
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-brand">
          <ArrowLeft className="size-4" />
          Back to cart
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
          <Home className="size-4" />
          Continue shopping
        </Link>
      </div>
    </div>
  );
}


