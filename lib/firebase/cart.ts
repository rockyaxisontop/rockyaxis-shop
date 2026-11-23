"use client";

import { auth } from "@/lib/firebase/client";

export type CartItem = {
  /** Channel3 canonical product id. */
  productId: string;
  title: string;
  image?: string;
  brand?: string;
  /** Selected variant labels, e.g. { Color: "Black", Size: "M" }. */
  options?: Record<string, string>;
  price: number;
  currency: string;
  /** Merchant buy URL (commission link) for this item. */
  url?: string;
  quantity: number;
};

export function cartItemId(item: Pick<CartItem, "productId" | "options">) {
  const suffix = item.options
    ? Object.entries(item.options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join("|")
    : "";
  return suffix ? `${item.productId}__${suffix}` : item.productId;
}

/** Calls our own cart API with the Firebase ID token attached. */
async function cartApi<T>(init?: RequestInit & { body?: string }): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to use your cart.");
  const token = await user.getIdToken();
  const response = await fetch("/api/cart", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Cart update failed.");
  return body as T;
}

/** A callback that stops the cart subscription. */
type Unsubscribe = () => void;

/**
 * Live cart subscription.
 *
 * Firestore is closed to the browser now (no read, no write), so this polls our
 * own API instead of opening an `onSnapshot` listener. The interval is short
 * while the tab is visible and pauses entirely when it is hidden, which keeps
 * reads low — the whole point of the backend move.
 */
export function subscribeCart(uid: string, onChange: (items: CartItem[]) => void): Unsubscribe {
  void uid; // identity comes from the verified token server-side
  let active = true;

  const load = async () => {
    try {
      const { items } = await cartApi<{ items: CartItem[] }>();
      if (active) onChange(items);
    } catch {
      if (active) onChange([]);
    }
  };

  void load();
  const timer = setInterval(() => {
    if (document.visibilityState === "visible") void load();
  }, 15000);

  const onVisible = () => {
    if (document.visibilityState === "visible") void load();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);

  return () => {
    active = false;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
  };
}

export async function addToCart(uid: string, item: Omit<CartItem, "quantity"> & { quantity?: number }) {
  void uid;
  await cartApi({ method: "POST", body: JSON.stringify({ action: "add", item }) });
}

export async function setCartQuantity(uid: string, id: string, quantity: number) {
  void uid;
  await cartApi({ method: "POST", body: JSON.stringify({ action: "quantity", id, quantity }) });
}

export async function removeFromCart(uid: string, id: string) {
  void uid;
  await cartApi({ method: "POST", body: JSON.stringify({ action: "remove", id }) });
}
