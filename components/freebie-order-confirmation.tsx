"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { useAuth } from "@/components/providers";
import { freebieApi } from "@/lib/freebies/client";
import type { FreebieOrder } from "@/lib/freebies/types";

export function FreebieOrderConfirmation({ orderId }: { orderId: string }) {
  const { user, loading } = useAuth();
  const [order, setOrder] = useState<FreebieOrder | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setState("error");
      return;
    }
    freebieApi
      .listOrders()
      .then(({ orders }) => {
        const found = orders.find((o) => o.id === orderId);
        if (found) {
          setOrder(found);
          setState("ready");
        } else {
          setState("error");
        }
      })
      .catch(() => setState("error"));
  }, [loading, user, orderId]);

  if (state === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  if (state === "error" || !order) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-xl font-bold text-ink">Order not found</h1>
        <p className="text-sm text-ink-soft">Sign in with the account that placed it.</p>
        <Link href="/cart" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">
          Back to cart
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 py-10">
      <div className="rounded-2xl border border-stock/30 bg-stock-bg p-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-stock" />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Order confirmed!</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Your freebie order was placed successfully. We&apos;ll contact you to arrange delivery.
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-white p-3 text-left">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
            {order.product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.product.image} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold text-ink">{order.product.title}</p>
            <p className="text-xs font-bold text-stock">FREE</p>
          </div>
        </div>

        <dl className="mt-4 space-y-1 text-left text-xs text-ink-soft">
          <div className="flex justify-between">
            <dt>Order ID</dt>
            <dd className="font-mono text-ink">{order.id.slice(0, 12)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Total paid</dt>
            <dd className="font-semibold text-ink">
              {new Intl.NumberFormat("en", { style: "currency", currency: order.currency }).format(0)}
            </dd>
          </div>
        </dl>

        <Link
          href="/"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-bold text-white"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
