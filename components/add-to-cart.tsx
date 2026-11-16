"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShoppingBag, ShoppingCart, Zap } from "lucide-react";

import { useAuth } from "@/components/providers";
import { addToCart } from "@/lib/firebase/cart";

type AddToCartProps = {
  productId: string;
  title: string;
  image?: string;
  brand?: string;
  price: number;
  currency: string;
  url?: string;
  options?: Record<string, string>;
};

/**
 * The three actions on a product page:
 *
 *  - Buy now     — adds the item and goes straight to the cart (checkout next)
 *  - Add to cart — adds the item and stays here
 *  - View cart   — always available, so the cart is never more than one tap away
 *
 * Both "add" actions use the same save, so pressing Buy now after Add to cart
 * simply re-saves (a merge) and moves on instead of erroring.
 */
export function AddToCart(props: AddToCartProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "buying" | "done" | "error">("idle");

  const saved = status === "done";

  async function save(action: "cart" | "buy") {
    // Signed out: send them to sign in, then back to this product.
    if (!user) {
      const next = `/products/${props.productId}`;
      router.push(`/login?next=${encodeURIComponent(action === "buy" ? `/cart` : next)}`);
      return;
    }

    setStatus(action === "buy" ? "buying" : "saving");
    try {
      await addToCart(user.uid, props);
      if (action === "buy") {
        router.push("/cart");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const busy = status === "saving" || status === "buying";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void save("buy")}
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f36d25] to-[#ee385e] px-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(238,56,94,0.28)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
      >
        {status === "buying" ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
        {status === "buying" ? "Opening your cart…" : "Buy now"}
      </button>

      <button
        type="button"
        onClick={() => void save("cart")}
        disabled={busy}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand-tint px-4 text-sm font-bold text-brand transition hover:border-brand hover:bg-brand/10 active:scale-[0.99] disabled:opacity-60"
      >
        {status === "saving" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : saved ? (
          <Check className="size-4" />
        ) : (
          <ShoppingBag className="size-4" />
        )}
        {status === "saving" ? "Adding…" : saved ? "Added to cart" : "Add to cart"}
      </button>

      <Link
        href="/cart"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand active:scale-[0.99]"
      >
        <ShoppingCart className="size-4" />
        View your order cart
      </Link>

      {status === "error" ? (
        <p className="text-xs text-destructive">Couldn&apos;t save. Check Firestore rules.</p>
      ) : null}
    </div>
  );
}
