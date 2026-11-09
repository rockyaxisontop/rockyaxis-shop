"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from "firebase/firestore";

import { firebaseConfig } from "./config";

/**
 * Firebase runs directly from the browser – there is no backend.
 * Security is enforced by Firebase Auth + Firestore Security Rules.
 */
export const firebaseApp: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

let firestore: Firestore | undefined;

/** Firestore with an offline cache shared across the tab (fast repeat loads). */
export function getDb(): Firestore {
  if (firestore) return firestore;

  try {
    firestore = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
    });
  } catch {
    // Already initialized (e.g. under React Strict Mode double-invocation or HMR).
    firestore = getFirestore(firebaseApp);
  }

  return firestore;
}
