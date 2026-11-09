"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cartItemId, removeFromCart, setCartQuantity, subscribeCart, type CartItem } from "@/lib/firebase/cart";

export function CartView() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Your cart</h1>
        <p className="text-sm text-muted-foreground">Sign in to see what you saved.</p>
        <Button asChild>
          <Link href="/login?next=/cart">Sign in</Link>
        </Button>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currency = items[0]?.currency ?? "USD";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>

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
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <ul className="divide-y rounded-xl border">
            {items.map((item) => {
              const id = cartItemId(item);
              return (
                <li key={id} className="flex gap-4 p-4">
                  <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title} className="size-full object-cover" />
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
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

                  <div className="flex flex-col items-end justify-between">
                    <div className="flex items-center gap-1 rounded-md border">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="grid size-8 place-items-center hover:bg-accent"
                        onClick={() => void setCartQuantity(user.uid, id, item.quantity - 1)}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="grid size-8 place-items-center hover:bg-accent"
                        onClick={() => void setCartQuantity(user.uid, id, item.quantity + 1)}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove item"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => void removeFromCart(user.uid, id)}
                    >
                      <Trash2 className="size-3.5" /> Remove
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
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
