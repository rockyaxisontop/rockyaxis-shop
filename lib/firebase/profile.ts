"use client";

import { getProfile, saveProfile } from "./profile-client";

/** The only role a self-service sign-up can ever hold. */
export const DEFAULT_ROLE = "user";

/**
 * Creates the customer's user document on first sign-in.
 *
 * Goes through /api/profile, so `users/*` can stay closed to the browser. The
 * server writes `role: "user"`; an existing document is never overwritten, so a
 * returning admin is never demoted.
 */
export async function ensureUserProfile(user: {
  uid: string;
  email: string | null;
  displayName?: string | null;
}) {
  void user;
  try {
    const { profile } = await getProfile();
    if (profile) return;
    await saveProfile({ fullName: user.displayName ?? "" });
  } catch {
    /* best effort: never block sign-in on this */
  }
}
