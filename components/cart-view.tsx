"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift, House, LockKeyhole, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck, ArrowRight } from "lucide-react";

import { useCurrency } from "@/components/currency-provider";
import {
  CartOrderStatus,
  CartOrderSummary,
  cartLineKey,
  useCartOrderState,
} from "@/components/messaging/cart-order-status";
import { useAuth } from "@/components/providers";
import { useFreebieCampaigns } from "@/components/freebie-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  STORE_DISCOUNT_PERCENT,
  storeLineTotal,
  storeListPrice,
  storePrice,
} from "@/lib/discount";
import { formatMoney } from "@/lib/format";
import { cartItemId, removeFromCart, setCartQuantity, subscribeCart, type CartItem } from "@/lib/firebase/cart";
import { cn } from "@/lib/utils";

export function CartView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { currency: localCurrency, countryName, locationLabel } = useCurrency();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const { campaigns } = useFreebieCampaigns(Boolean(user));
  // Must be called unconditionally, before any early return.
  const { orders: chatOrders, forLine, isOrdered, orderFor, failed } = useCartOrderState();

  useEffect(() => {
    if (!user) {
      setItems([]);
      setReady(false);
      return;
    }
    const unsubscribe = subscribeCart(user.uid, (next) => {
      setItems(next);
      setReady(true);
    });
    return unsubscribe;
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-8 py-8">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <h1 className="text-2xl font-semibold">Your cart</h1>
          <HomeLink />
        </header>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-surface-2">
            <ShoppingBag className="size-7 text-ink-soft" />
          </span>
          <p className="text-sm text-muted-foreground">Sign in to see what you saved.</p>
          <Button asChild>
            <Link href="/login?next=/cart">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Cart items store USD prices; everything shown is converted to the visitor's currency.
  const currency = localCurrency;

  // Lines already in an order are EXCLUDED from the money: they were paid (or are
  // being paid) in the chat, so counting them again would double-charge.
  const lineKeyOf = (item: CartItem) => cartLineKey(item.productId, item.options);
  const payable = items.filter((item) => !isOrdered(lineKeyOf(item)));
  const orderedItems = items.filter((item) => isOrdered(lineKeyOf(item)));

  const listTotal = payable.reduce(
    (sum, item) => sum + storeListPrice(item.price, currency) * item.quantity,
    0,
  );
  const total = payable.reduce(
    (sum, item) => sum + storeLineTotal(item.price, item.quantity, currency),
    0,
  );
  const storeSavingsValue = listTotal - total;
  const unlocked = payable.filter((item) => campaigns[item.productId]?.status === "completed");
  const unlockedValue = unlocked.reduce(
    (sum, item) => sum + storeLineTotal(item.price, item.quantity, currency),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
          <p className="text-sm text-ink-soft">
            {items.length} {items.length === 1 ? "item" : "items"}
            {unlocked.length > 0 ? ` · ${unlocked.length} unlocked free` : ""}
            {orderedItems.length > 0 ? ` · ${orderedItems.length} already ordered` : ""}
          </p>
        </div>
        <HomeLink />
      </header>

      {!ready ? (
        <Skeleton className="h-28 w-full" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-surface-2">
            <ShoppingBag className="size-7 text-ink-soft" />
          </span>
          <div>
            <p className="font-semibold text-ink">Your cart is empty</p>
            <p className="text-sm text-ink-soft">Find something you love.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/search">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
          {/* Items */}
          <div className="flex flex-col gap-3">
            {/* If the order state can't be fetched, say so: silently showing
                "not ordered" is what made this confusing before. */}
            {failed ? (
              <p
                role="status"
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] font-medium text-ink-soft"
              >
                Live order status is unavailable right now. If an item doesn&apos;t show a status, refresh in a
                moment — do not place the same order twice.
              </p>
            ) : null}
            <CartOrderSummary orders={chatOrders} />
            <ul className="flex flex-col gap-3">
              {items.map((item) => {
              const id = cartItemId(item);
              const campaign = campaigns[item.productId];
              const isFree = campaign?.status === "completed";

              return (
                <li
                  key={id}
                  className={cn(
                    "flex gap-3 rounded-2xl border bg-white p-3 transition-shadow hover:shadow-sm sm:gap-4 sm:p-4",
                    isFree ? "border-stock/40 bg-stock-bg/40" : "border-border",
                  )}
                >
                  <Link
                    href={`/products/${item.productId}`}
                    className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-24"
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title} className="size-full object-cover" />
                    ) : null}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    {item.brand ? (
                      <p className="text-[10px] font-bold tracking-wider text-ink-soft uppercase">
                        {item.brand}
                      </p>
                    ) : null}
                    <Link
                      href={`/products/${item.productId}`}
                      className="line-clamp-2 text-sm leading-snug font-semibold text-ink hover:underline"
                    >
                      {item.title}
                    </Link>
                    {item.options && Object.keys(item.options).length > 0 ? (
                      <p className="mt-0.5 text-[11px] text-ink-soft">
                        {Object.entries(item.options)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" · ")}
                      </p>
                    ) : null}

                    {/* Order state for this exact row, once it's been sent to the chat. */}
                    {(() => {
                      const order = forLine(cartLineKey(item.productId, item.options));
                      return order ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <CartOrderStatus status={order.status} />
                          {order.status === "confirmed" ? (
                            <span className="text-[10px] font-semibold text-stock">
                              You can buy this again
                            </span>
                          ) : null}
                        </div>
                      ) : null;
                    })()}

                    <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1.5">
                      {isFree ? (
                        <>
                          <span className="text-sm font-extrabold text-stock">FREE</span>
                          <span className="text-xs text-ink-soft line-through">
                            {formatMoney(storePrice(item.price, currency), currency)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-ink">
                            {formatMoney(storePrice(item.price, currency), currency)}
                          </span>
                          <span className="text-[11px] text-ink-soft line-through">
                            {formatMoney(storeListPrice(item.price, currency), currency)}
                          </span>
                          <span className="rounded bg-save px-1.5 py-0.5 text-[10px] font-extrabold text-ink">
                            −{STORE_DISCOUNT_PERCENT}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                    {(() => {
                      // An ordered line is LOCKED — quantity and remove are gone.
                      // The customer gets a link to the order instead, so the
                      // status and details live in one clear place.
                      const lineKey = cartLineKey(item.productId, item.options);
                      const locked = isOrdered(lineKey);
                      const order = orderFor(lineKey);

                      if (locked) {
                        return (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-bold text-ink-soft ring-1 ring-border">
                              <LockKeyhole className="size-3" />
                              Qty {item.quantity}
                            </span>
                            {order ? (
                              <Link
                                href={`/orders/${encodeURIComponent(order.reference)}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-brand/40 bg-white px-2 py-1 text-[10px] font-bold text-brand transition hover:bg-brand-tint"
                              >
                                View order
                                <ArrowRight className="size-3" />
                              </Link>
                            ) : null}
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="flex items-center rounded-lg border border-border">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              className="grid size-8 place-items-center text-ink-soft hover:bg-surface-2 hover:text-ink"
                              onClick={() => void setCartQuantity(user.uid, id, item.quantity - 1)}
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              className="grid size-8 place-items-center text-ink-soft hover:bg-surface-2 hover:text-ink"
                              onClick={() => void setCartQuantity(user.uid, id, item.quantity + 1)}
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-label="Remove item"
                            className="flex min-h-8 items-center gap-1 p-1 text-[11px] text-ink-soft hover:text-destructive"
                            onClick={() => void removeFromCart(user.uid, id)}
                          >
                            <Trash2 className="size-3.5" />
                            <span className="max-sm:sr-only">Remove</span>
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </li>
              );
            })}
            </ul>
            </div>

          {/* Summary */}
          <aside className="h-fit lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
              <h2 className="text-sm font-bold text-ink">Order summary</h2>

              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">List price</dt>
                  <dd className="font-semibold text-ink-soft line-through">{formatMoney(listTotal, currency)}</dd>
                </div>
                <div className="flex justify-between text-stock">
                  <dt className="flex items-center gap-1">
                    <Tag className="size-3.5" /> MT Store discount ({STORE_DISCOUNT_PERCENT}%)
                  </dt>
                  <dd className="font-semibold">−{formatMoney(storeSavingsValue, currency)}</dd>
                </div>
                {unlockedValue > 0 ? (
                  <div className="flex justify-between text-stock">
                    <dt className="flex items-center gap-1">
                      <Gift className="size-3.5" /> Freebie savings
                    </dt>
                    <dd className="font-semibold">−{formatPrice(unlockedValue, currency)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Delivery</dt>
                  <dd className="font-semibold text-stock">Free</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base">
                  <dt className="font-bold text-ink">Total</dt>
                  <dd className="font-extrabold text-ink">
                    {formatMoney(Math.max(0, total - unlockedValue), currency)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/checkout"
                  prefetch={false}
                  onTouchStart={() => router.prefetch("/checkout")}
                  onMouseEnter={() => router.prefetch("/checkout")}
                  className="inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white transition hover:brightness-110"
                >
                  <ShoppingBag className="size-4" />
                  Continue to checkout
                </Link>
                <Link
                  href="/freebie"
                  prefetch={false}
                  onTouchStart={() => router.prefetch("/freebie")}
                  onMouseEnter={() => router.prefetch("/freebie")}
                  className="inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] text-sm font-bold text-white transition hover:brightness-110"
                >
                  <Gift className="size-4" />
                  Get items for FREE
                </Link>
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-[11px] text-ink-soft">
                <li className="flex items-center gap-1.5">
                  <Truck className="size-3.5 text-brand" /> Free delivery across {countryName}
                </li>
                <li className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-brand" /> Ships from {locationLabel}
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-brand" /> Genuine products, warranty included
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function HomeLink() {
  return (
    <Link
      href="/"
      className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand"
    >
      <House className="size-4" />
      Home
    </Link>
  );
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}
