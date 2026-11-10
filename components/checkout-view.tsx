"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, ShoppingBag } from "lucide-react";

import { useAuth } from "@/components/providers";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeCart, type CartItem } from "@/lib/firebase/cart";

/** Paid checkout: retailer purchase links only. Freebie campaigns live at /freebie. */
export function CheckoutView() {
  const { user, loading } = useAuth();
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

  if (loading || (user && !ready)) {
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
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Buy your items</h1>
          <p className="text-sm text-ink-soft">Choose Buy now to continue to the retailer.</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <ShoppingBag className="size-8 text-ink-soft" />
          <p className="text-sm text-ink-soft">Your cart is empty.</p>
          <Link href="/search" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.title} className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  {item.brand ? (
                    <p className="text-[10px] font-bold tracking-wider text-ink-soft uppercase">{item.brand}</p>
                  ) : null}
                  <p className="line-clamp-2 text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {formatPrice(item.price, item.currency)}
                    <span className="ml-2 text-xs font-normal text-ink-soft">× {item.quantity}</span>
                  </p>
                </div>
              </div>

              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:brightness-110 sm:w-auto"
                >
                  <ShoppingBag className="size-4" />
                  Buy now
                  <ExternalLink className="size-3.5" />
                </a>
              ) : (
                <p className="text-sm text-ink-soft">Purchase link unavailable.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}
