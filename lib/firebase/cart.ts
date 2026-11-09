"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { getDb } from "./client";

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

function cartCollection(uid: string) {
  return collection(getDb(), "carts", uid, "items");
}

/** Live cart subscription. Returns an unsubscribe function. */
export function subscribeCart(uid: string, onChange: (items: CartItem[]) => void): Unsubscribe {
  return onSnapshot(cartCollection(uid), (snapshot) => {
    onChange(snapshot.docs.map((d) => d.data() as CartItem));
  });
}

export async function addToCart(uid: string, item: Omit<CartItem, "quantity"> & { quantity?: number }) {
  const id = cartItemId(item);
  const quantity = item.quantity ?? 1;
  await setDoc(
    doc(cartCollection(uid), id),
    { ...item, id, quantity, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function setCartQuantity(uid: string, id: string, quantity: number) {
  if (quantity < 1) return removeFromCart(uid, id);
  await setDoc(doc(cartCollection(uid), id), { quantity, updatedAt: serverTimestamp() }, { merge: true });
}

export async function removeFromCart(uid: string, id: string) {
  await deleteDoc(doc(cartCollection(uid), id));
}
