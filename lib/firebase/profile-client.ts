"use client";

import { auth } from "@/lib/firebase/client";

/** The only role a self-service sign-up can ever hold. */
export const DEFAULT_ROLE = "user";

async function call<T>(init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to continue.");
  const token = await user.getIdToken();
  const response = await fetch("/api/profile", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Profile update failed.");
  return body as T;
}

/** Reads the caller's profile through the API (Firestore is closed to clients). */
export function getProfile<T = Record<string, unknown>>(): Promise<{ profile: T | null }> {
  return call<{ profile: T | null }>();
}

/**
 * Saves profile fields.
 *
 * The server decides what is writable — `role` can never be set here, which is
 * why the backend, not the client, owns privilege.
 */
export function saveProfile(profile: Record<string, unknown>) {
  return call<{ ok: true }>({ method: "POST", body: JSON.stringify({ profile }) });
}
