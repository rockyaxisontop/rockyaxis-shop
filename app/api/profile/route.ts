import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse, getAdminDb, requireUser } from "@/lib/firebase/admin";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

const USERS = "users";

/**
 * Fields a customer may write about themselves.
 *
 * `role` and `disabled` are deliberately absent: privilege can only be granted
 * by the server, never by the account itself. Anything not on this list is
 * silently dropped instead of stored.
 */
const WRITABLE = new Set([
  "fullName",
  "phoneNumber",
  "buildingStreet",
  "locality",
  "region",
  "city",
  "area",
  "address",
  "label",
  "birthday",
  "gender",
  "coordinates",
  "photoURL",
]);

/** GET /api/profile — the caller's own profile document. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const snapshot = await getAdminDb().collection(USERS).doc(user.uid).get();
    return NextResponse.json({ profile: snapshot.exists ? snapshot.data() : null });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/profile  { profile }
 *
 * Creates the document on first sign-in (always with role "user") and updates
 * the whitelisted fields afterwards.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    const limit = rateLimit(`profile:${clientKey(request, user.uid)}`, 20, 60_000);
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);

    const body = (await request.json().catch(() => ({}))) as {
      profile?: Record<string, unknown>;
    };
    if (!body.profile || typeof body.profile !== "object") {
      throw new ApiError("A profile object is required.", 400);
    }

    const ref = getAdminDb().collection(USERS).doc(user.uid);
    const existing = await ref.get();

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(body.profile)) {
      if (WRITABLE.has(key) && value !== undefined) patch[key] = value;
    }

    if (!existing.exists) {
      // First write: establish the account as a normal customer.
      await ref.set({
        ...patch,
        role: "user",
        email: user.email ?? null,
        createdAt: new Date(),
      });
      return NextResponse.json({ ok: true, created: true });
    }

    await ref.set(patch, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
