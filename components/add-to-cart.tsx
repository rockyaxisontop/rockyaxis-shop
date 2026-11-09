"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, ShoppingBag } from "lucide-react";

import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
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

export function AddToCart(props: AddToCartProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  if (!user) {
    return (
      <Button asChild className="h-10">
        <Link href={`/login?next=/products/${props.productId}`}>
          <ShoppingBag className="size-4" /> Sign in to save
        </Link>
      </Button>
    );
  }

  async function handleClick() {
    setStatus("saving");
    try {
      await addToCart(user!.uid, props);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={status === "saving" || status === "done"} className="h-10">
        {status === "saving" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : status === "done" ? (
          <Check className="size-4" />
        ) : (
          <ShoppingBag className="size-4" />
        )}
        {status === "done" ? "Saved to cart" : "Add to cart"}
      </Button>
      {status === "done" ? (
        <Link href="/cart" className="text-center text-xs text-muted-foreground hover:text-foreground">
          View cart
        </Link>
      ) : null}
      {status === "error" ? (
        <p className="text-xs text-destructive">Couldn&apos;t save. Check Firestore rules.</p>
      ) : null}
    </div>
  );
}
