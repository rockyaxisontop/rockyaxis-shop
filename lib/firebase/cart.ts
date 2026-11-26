"use client";

import { auth } from "@/lib/firebase/client";

export type CartItem = {
  /** Catalogue product id (eBay item id). */
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
 * One shared poller for the whole page.
 *
 * The cart page previously mounted TWO independent subscribers (the cart itself
 * and the freebie panel), each polling every 15 seconds — double the Firestore
 * reads for no benefit. All subscribers now share a single timer and a single
 * request, and every mutation refreshes it immediately.
 */
const listeners: Set<(items: CartItem[]) => void> = new Set();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let inFlight: Promise<void> | null = null;
const lastItems: { value: CartItem[] } = { value: [] };

async function fetchCart() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { items } = await cartApi<{ items: CartItem[] }>();
      lastItems.value = items;
      listeners.forEach((listener) => listener(items));
    } catch {
      // Keep the last known items — never render "empty" because a request
      // failed. A quota or network blip is not an empty cart.
      console.warn("[cart] refresh failed; keeping the last known cart");
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      void fetchCart();
    }
  }, 60000);
}

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

/** Refresh the shared cart now (called after every mutation). */
export function refreshCart() {
  return fetchCart();
}

/**
 * Cart subscription.
 *
 * Loads once, then refreshes: every 60s while visible, whenever the tab regains
 * focus, and immediately after any cart mutation. Deliberately not a live
 * listener — that is what made the read volume unaffordable.
 */
export function subscribeCart(uid: string, onChange: (items: CartItem[]) => void): Unsubscribe {
  void uid; // identity comes from the verified token, server-side
  listeners.add(onChange);
  if (lastItems.value.length > 0) onChange(lastItems.value);

  void fetchCart();
  startPolling();

  const onVisible = () => {
    if (document.visibilityState === "visible") void fetchCart();
  };
  window.addEventListener("focus", onVisible);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("focus", onVisible);
    // Stop polling once nobody is listening (leaving the cart page).
    if (listeners.size === 0) {
      stopPolling();
    }
  };
}

export async function addToCart(uid: string, item: Omit<CartItem, "quantity"> & { quantity?: number }) {
  void uid;
  await cartApi({ method: "POST", body: JSON.stringify({ action: "add", item }) });
  await refreshCart();
}

export async function setCartQuantity(uid: string, id: string, quantity: number) {
  void uid;
  await cartApi({ method: "POST", body: JSON.stringify({ action: "quantity", id, quantity }) });
  await refreshCart();
}

export async function removeFromCart(uid: string, id: string) {
  void uid;
  await cartApi({ method: "POST", body: JSON.stringify({ action: "remove", id }) });
  await refreshCart();
}
