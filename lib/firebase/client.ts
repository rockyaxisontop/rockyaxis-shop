"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

import { firebaseConfig } from "./config";

/**
 * Firebase on the client is used for ONE thing: authentication.
 *
 * All data (cart, profile, messages, orders, freebies) goes through our own API
 * routes with the Admin SDK, so Firestore rules can deny every client read and
 * write outright. Keeping Firestore out of the bundle means the browser cannot
 * even attempt a direct query.
 */
export const firebaseApp: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

/**
 * Kept only so older imports don't break. Any remaining call is a bug: data
 * must go through `/api/*`. Throws loudly instead of silently using stale rules.
 */
export function getDb(): never {
  throw new Error(
    "Direct Firestore access was removed. Use the /api routes — the browser has no read or write access.",
  );
}
