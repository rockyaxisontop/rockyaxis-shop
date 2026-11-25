"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Loader2, PackageCheck, ShoppingBag, XCircle } from "lucide-react";

import { useCurrency } from "@/components/currency-provider";
import { auth } from "@/lib/firebase/client";
import { convertFromUsd, formatLocal } from "@/lib/currency";
import { storeLineTotal, storeListPrice, storePrice } from "@/lib/discount";
import type { ChatOrderStatus } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";

type OrderItem = {
  productId: string;
  title: string;
  image?: string;
  options?: Record<string, string>;
  quantity: number;
  price: number;
  currency: string;
};

type OrderResponse = {
  order: {
    reference: string;
    status: ChatOrderStatus;
    total: number;
    currency: string;
    itemCount: number;
    createdAt: string | null;
    confirmedAt: string | null;
  };
  items: OrderItem[];
  totals: Record<string, number>;
};

const STATUS: Record<
  ChatOrderStatus,
  { label: string; note: string; icon: typeof Clock3; className: string }
> = {
  sent: {
    label: "Order sent",
    note: "MT Store has received your order and is reviewing it. Your order will reach you in under 24–48 hours once payment is confirmed.",
    icon: PackageCheck,
    className: "bg-[#fff6ef] text-[#b34a12] ring-[#f36d25]/30",
  },
  awaiting_payment: {
    label: "Payment request sent",
    note: "MT Store accepted your order and sent a payment request in the chat. Your order will reach you in under 24–48 hours after payment.",
    icon: Clock3,
    className: "bg-brand-tint text-brand ring-brand/30",
  },
  confirmed: {
    label: "Order success",
    note: "Payment confirmed. Your order is being prepared and will reach you in under 24–48 hours.",
    icon: CheckCircle2,
    className: "bg-stock-bg text-stock ring-stock/30",
  },
  cancelled: {
    label: "Cancelled",
    note: "This order was cancelled. Nothing will be delivered or charged.",
    icon: XCircle,
    className: "bg-destructive/5 text-destructive ring-destructive/30",
  },
};

/** Human date + time for the timeline, in the visitor's own locale. */
function stamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Read-only order page — the destination of every "View order" link. */
export function OrderDetails({ reference }: { reference: string }) {
  const { currency } = useCurrency();
  const [data, setData] = useState<OrderResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Sign in to view this order.");
        const token = await user.getIdToken();
        const response = await fetch(`/api/orders/${encodeURIComponent(reference)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await response.json().catch(() => ({}))) as OrderResponse & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Couldn't load this order.");
        if (active) {
          setData(body);
          setState("ready");
        }
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Couldn't load this order.");
        setState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [reference]);

  if (state === "loading") {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <h1 className="text-lg font-bold text-ink">Order not available</h1>
        <p className="text-sm text-ink-soft">{error}</p>
        <Link href="/cart" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          Back to cart
        </Link>
      </div>
    );
  }

  const { order, items } = data;
  const meta = STATUS[order.status];
  const Icon = meta.icon;

  // Same maths as the cart and checkout: the 80% store price per line, in the
  // visitor's currency, summed — never the raw source price on the order.
  const totalLocal = formatLocal(
    items.length > 0
      ? items.reduce(
          (sum, item) => sum + storeLineTotal(item.price, item.quantity, currency),
          0,
        )
      : storePrice(order.total, currency),
    currency,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/cart"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-1.5 text-sm font-semibold text-ink-soft transition hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          Back to cart
        </Link>
        <Link
          href="/message"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-ink transition hover:border-brand hover:text-brand"
        >
          Open chat
        </Link>
      </div>

      <section className={cn("rounded-2xl p-4 ring-1", meta.className)}>
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <Icon className="size-4" />
          {meta.label}
        </p>
        <p className="mt-1 text-xs leading-5 opacity-90">{meta.note}</p>
        <p className="mt-2 font-mono text-[11px] font-bold opacity-70">{order.reference}</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <h2 className="border-b border-border px-4 py-2.5 text-sm font-bold text-ink">
          {items.length || order.itemCount} item{(items.length || order.itemCount) === 1 ? "" : "s"}
        </h2>
        <ul className="divide-y divide-border">
          {items.map((item, index) => (
            <li key={`${item.productId}-${index}`} className="flex gap-3 p-3">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-ink">{item.title}</p>
                {item.options && Object.keys(item.options).length > 0 ? (
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {Object.entries(item.options)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(" · ")}
                  </p>
                ) : null}
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-bold text-ink">
                    {formatLocal(storeLineTotal(item.price, item.quantity, currency), currency)}
                  </span>
                  <span className="text-[11px] text-ink-soft line-through">
                    {formatLocal(storeListPrice(item.price, currency) * item.quantity, currency)}
                  </span>
                  <span className="text-[11px] text-ink-soft">Qty {item.quantity}</span>
                </p>
              </div>
              <Link
                href={`/products/${encodeURIComponent(item.productId)}`}
                className="shrink-0 self-center text-[11px] font-bold text-brand hover:underline"
              >
                Product
              </Link>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="p-4 text-xs text-ink-soft">
              Order details are in your chat with MT Store.
            </li>
          ) : null}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm font-extrabold text-ink">
          <span>Total</span>
          <span>{totalLocal}</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <h2 className="border-b border-border px-4 py-2.5 text-sm font-bold text-ink">
          Order timeline
        </h2>
        <dl className="divide-y divide-border text-xs">
          <div className="flex items-start justify-between gap-3 px-4 py-2.5">
            <dt className="text-ink-soft">Order placed</dt>
            <dd className="text-right font-semibold text-ink">{stamp(order.createdAt)}</dd>
          </div>
          {order.confirmedAt ? (
            <div className="flex items-start justify-between gap-3 px-4 py-2.5">
              <dt className="text-ink-soft">Payment confirmed</dt>
              <dd className="text-right font-semibold text-stock">{stamp(order.confirmedAt)}</dd>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-3 px-4 py-2.5">
            <dt className="text-ink-soft">Estimated delivery</dt>
            <dd className="text-right font-semibold text-ink">Under 24–48 hours</dd>
          </div>
          <div className="flex items-start justify-between gap-3 px-4 py-2.5">
            <dt className="text-ink-soft">Status</dt>
            <dd className="text-right font-semibold text-ink">{meta.label}</dd>
          </div>
        </dl>
      </section>

      <p className="flex items-center gap-1.5 px-1 text-[11px] text-ink-soft">
        <ShoppingBag className="size-3.5 text-brand" />
        Ordered products are locked in your cart and not charged again.
      </p>
    </div>
  );
}
