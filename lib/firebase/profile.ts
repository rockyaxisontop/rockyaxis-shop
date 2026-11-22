"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getDb } from "@/lib/firebase/client";

/** The only role a self-service sign-up can ever hold. */
export const DEFAULT_ROLE = "user";

/**
 * Creates the customer's user document on first sign-in.
 *
 * Every new account is written with `role: "user"`. Admin is never granted here:
 * Firestore rules reject a client write that sets any other role, and only the
 * server (Admin SDK) can raise it. Existing documents are left untouched, so a
 * returning admin is never demoted by signing in again.
 */
export async function ensureUserProfile(user: {
  uid: string;
  email: string | null;
  displayName?: string | null;
}) {
  const ref = doc(getDb(), "users", user.uid);
  const snapshot = await getDoc(ref).catch(() => null);
  if (snapshot?.exists()) return;

  await setDoc(ref, {
    role: DEFAULT_ROLE,
    fullName: user.displayName ?? "",
    email: user.email ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
