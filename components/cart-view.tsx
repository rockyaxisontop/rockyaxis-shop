"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { House, Minus, Plus, Trash2 } from "lucide-react";

import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cartItemId, removeFromCart, setCartQuantity, subscribeCart, type CartItem } from "@/lib/firebase/cart";

export function CartView() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const homeLink = (
    <Link
      href="/"
      className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand"
    >
      <House className="size-4" />
      Home
    </Link>
  );

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
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-40" />
          {homeLink}
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-8 py-8">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <h1 className="text-2xl font-semibold">Your cart</h1>
          {homeLink}
        </header>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">Sign in to see what you saved.</p>
          <Button asChild>
            <Link href="/login?next=/cart">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currency = items[0]?.currency ?? "USD";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        {homeLink}
      </header>

      {!ready ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border py-16 text-center">
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
          <Button asChild variant="outline">
            <Link href="/search">Find something</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
          <ul className="divide-y rounded-xl border">
            {items.map((item) => {
              const id = cartItemId(item);
              return (
                <li key={id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-20">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title} className="size-full object-cover" />
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {/* min-w-0 above is what stops long titles from widening the row */}
                    <Link href={`/products/${item.productId}`} className="line-clamp-2 text-sm font-medium hover:underline">
                      {item.title}
                    </Link>
                    {item.brand ? <p className="text-xs text-muted-foreground">{item.brand}</p> : null}
                    {item.options && Object.keys(item.options).length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(item.options)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" · ")}
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold">{formatPrice(item.price, item.currency)}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                    <div className="flex items-center rounded-md border">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="grid size-9 place-items-center hover:bg-accent sm:size-8"
                        onClick={() => void setCartQuantity(user.uid, id, item.quantity - 1)}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="grid size-9 place-items-center hover:bg-accent sm:size-8"
                        onClick={() => void setCartQuantity(user.uid, id, item.quantity + 1)}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove item"
                      className="flex min-h-9 items-center gap-1 p-1 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => void removeFromCart(user.uid, id)}
                    >
                      <Trash2 className="size-4 sm:size-3.5" /> <span className="max-sm:sr-only">Remove</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit rounded-xl border p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatPrice(total, currency)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Checkout happens on the retailer&apos;s site.
            </p>
            {items.find((item) => item.url)?.url ? (
              <a
                href={items.find((item) => item.url)!.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Continue to store
              </a>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}
