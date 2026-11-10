"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, House, Loader2 } from "lucide-react";

import { useAuth } from "@/components/providers";

type FreeOrder = {
  id: string;
  status: string;
  items: { title: string; quantity: number; price: number }[];
  subtotal: number;
  currency: string;
};

export function OrderConfirmationView({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [order, setOrder] = useState<FreeOrder | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/order-confirmation/${orderId}`)}`);
      return;
    }
    let active = true;
    void user.getIdToken().then((token) => fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).then(async (response) => {
      const body = await response.json() as { order?: FreeOrder; error?: string };
      if (!response.ok || !body.order) throw new Error(body.error ?? "Could not load this order.");
      if (active) setOrder(body.order);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load this order.");
    });
    return () => {
      active = false;
    };
  }, [loading, orderId, router, user]);

  if (loading || (!order && !error)) {
    return <div className="mx-auto flex min-h-72 w-full max-w-xl items-center justify-center"><Loader2 className="size-6 animate-spin text-brand" /></div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p role="alert" className="text-sm text-destructive">{error || "Order not found."}</p>
        <Link href="/cart" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Return to cart</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center py-10 text-center sm:py-16">
      <span className="grid size-14 place-items-center rounded-full bg-stock-bg text-stock">
        <Check className="size-7" />
      </span>
      <p className="mt-5 text-xs font-bold tracking-wider text-stock uppercase">Free order placed</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Your order request is confirmed</h1>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Your product is listed at NPR 0. Our team will review the order and contact you about delivery.
      </p>
      <div className="mt-7 w-full rounded-lg border border-border bg-white p-4 text-left">
        <p className="text-xs font-semibold text-ink-soft">ORDER REFERENCE</p>
        <p className="mt-1 break-all font-mono text-sm text-ink">{order.id}</p>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {order.items.map((item) => (
            <li key={item.title} className="flex justify-between gap-4 py-3 text-sm">
              <span className="min-w-0">{item.title} <span className="text-ink-soft">× {item.quantity}</span></span>
              <span className="shrink-0 font-semibold">NPR 0</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between text-sm font-bold text-ink"><span>Total</span><span>NPR 0</span></div>
      </div>
      <Link href="/" className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
        <House className="size-4" />
        Continue shopping
      </Link>
    </div>
  );
}