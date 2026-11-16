"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Headphones,
  Home,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { useAuth } from "@/components/providers";
import { Skeleton } from "@/components/ui/skeleton";
import { STORE_DISCOUNT_PERCENT, storeLineTotal, storePrice } from "@/lib/discount";
import { cartItemId, subscribeCart, type CartItem } from "@/lib/firebase/cart";

const WHATSAPP_NUMBER = "9779714501791";

/** Orders are sent to MT Store on WhatsApp so the team can confirm details. */
export function CheckoutView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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

  const totalsByCurrency = useMemo(
    () =>
      items.reduce<Record<string, number>>((totals, item) => {
        totals[item.currency] =
          (totals[item.currency] ?? 0) + storeLineTotal(item.price, item.quantity, item.currency);
        return totals;
      }, {}),
    [items],
  );

  const listTotalsByCurrency = useMemo(
    () =>
      items.reduce<Record<string, number>>((totals, item) => {
        totals[item.currency] = (totals[item.currency] ?? 0) + item.price * item.quantity;
        return totals;
      }, {}),
    [items],
  );

  function whatsappLink(message: string) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function productPageUrl(item: CartItem) {
    const options = new URLSearchParams(item.options ?? {}).toString();
    return `${origin}/products/${encodeURIComponent(item.productId)}${options ? `?${options}` : ""}`;
  }

  function itemOrderMessage(item: CartItem) {
    const lines = [
      "Hello MT Store! I’d like to buy this item:",
      "",
      `Product: ${item.title}`,
      item.brand ? `Brand: ${item.brand}` : null,
      item.options && Object.keys(item.options).length > 0
        ? `Options: ${Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(", ")}`
        : null,
      `Quantity: ${item.quantity}`,
      `Price each: ${formatPrice(storePrice(item.price, item.currency), item.currency)}`,
      `Subtotal: ${formatPrice(storeLineTotal(item.price, item.quantity, item.currency), item.currency)}`,
      `Product link: ${productPageUrl(item)}`,
      "",
      "Please confirm availability, delivery, and the final total. Thank you!",
    ];
    return lines.filter((line): line is string => line !== null).join("\n");
  }

  function allItemsOrderMessage() {
    const lines = [
      "Hello MT Store! I’d like to order all the items in my cart:",
      "",
      ...items.flatMap((item, index) => [
        `${index + 1}. ${item.title}`,
        item.brand ? `   Brand: ${item.brand}` : null,
        item.options && Object.keys(item.options).length > 0
          ? `   Options: ${Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(", ")}`
          : null,
        `   Quantity: ${item.quantity}`,
        `   Price each: ${formatPrice(storePrice(item.price, item.currency), item.currency)}`,
        `   Subtotal: ${formatPrice(storeLineTotal(item.price, item.quantity, item.currency), item.currency)}`,
        `   Product link: ${productPageUrl(item)}`,
        "",
      ].filter((line): line is string => line !== null)),
      `Cart total (${STORE_DISCOUNT_PERCENT}% store discount applied):`,
      ...Object.entries(totalsByCurrency).map(
        ([currency, amount]) => `- ${formatPrice(amount, currency)}`,
      ),
      "",
      "Please confirm availability, delivery, and the final total for my order. Thank you!",
    ];
    return lines.join("\n");
  }

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

  const supportLink = whatsappLink(
    "Hello MT Store! I have a question and would like some help, please.",
  );

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
          <h2 className="text-sm font-bold text-ink">Simple WhatsApp ordering</h2>
          <p className="mt-1 text-xs leading-5 text-ink-soft sm:text-sm">
            Send your order to MT Store. We’ll confirm availability, delivery, and the final price with you.
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
                          {formatPrice(storeLineTotal(item.price, item.quantity, item.currency), item.currency)}
                        </span>
                        <span className="text-xs text-ink-soft line-through">
                          {formatPrice(item.price * item.quantity, item.currency)}
                        </span>
                        {item.quantity > 1 ? (
                          <span className="text-xs text-ink-soft">
                            {formatPrice(storePrice(item.price, item.currency), item.currency)} × {item.quantity}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <a
                    href={whatsappLink(itemOrderMessage(item))}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Order ${item.title} on WhatsApp`}
                    className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#128c7e] px-4 text-sm font-bold text-white transition hover:bg-[#075e54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128c7e] focus-visible:ring-offset-2 sm:w-auto"
                  >
                    <MessageCircle className="size-4" />
                    Buy this item
                    <ExternalLink className="size-3.5" />
                  </a>
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
                {Object.entries(totalsByCurrency).map(([currency, total]) => (
                  <Fragment key={currency}>
                    <div className="flex justify-between gap-3 text-sm">
                      <dt className="text-ink-soft">List price ({currency})</dt>
                      <dd className="text-ink-soft line-through">
                        {formatPrice(listTotalsByCurrency[currency] ?? total, currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 text-sm text-stock">
                      <dt>MT Store discount ({STORE_DISCOUNT_PERCENT}%)</dt>
                      <dd className="font-semibold">
                        −{formatPrice((listTotalsByCurrency[currency] ?? total) - total, currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 text-sm">
                      <dt className="font-semibold text-ink">Your total ({currency})</dt>
                      <dd className="font-bold text-ink">{formatPrice(total, currency)}</dd>
                    </div>
                  </Fragment>
                ))}
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-ink-soft">Delivery</dt>
                  <dd className="font-medium text-ink-soft">Confirm via WhatsApp</dd>
                </div>
              </dl>

              <a
                href={whatsappLink(allItemsOrderMessage())}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#128c7e] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#075e54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128c7e] focus-visible:ring-offset-2"
              >
                <MessageCircle className="size-4" />
                Order all items on WhatsApp
              </a>
              <p className="mt-2 text-center text-[11px] leading-5 text-ink-soft">
                Opens WhatsApp with your item list ready to send.
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
                  <a
                    href={supportLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
                  >
                    <MessageCircle className="size-3.5" />
                    Contact support
                    <ExternalLink className="size-3" />
                  </a>
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

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}
