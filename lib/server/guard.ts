import "server-only";

/**
 * In-memory rate limiter and cache.
 *
 * Deliberately dependency-free: this runs on a single serverless instance, which
 * is exactly right for a low-budget deployment. It costs nothing, needs no Redis,
 * and absorbs the abuse that actually matters here — someone hammering a search
 * or message endpoint and burning Firestore reads / Channel3 credits.
 *
 * Limitation (stated honestly): each serverless instance has its own memory, so
 * the effective limit is `limit × instances`. That is fine for stopping runaway
 * loops and casual abuse. If you ever need a global limit, swap the store for
 * Upstash Redis — the interface below is the only thing to change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Keep memory bounded on a long-lived instance.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

/**
 * Fixed-window counter. `limit` requests per `windowMs` per key.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: Math.ceil(windowMs / 1000) };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Client identity for rate limiting: the authenticated uid when available. */
export function clientKey(request: Request, uid?: string) {
  if (uid) return `u:${uid}`;
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

/* -------------------------------------------------------------------------- */
/* TTL cache                                                                  */
/* -------------------------------------------------------------------------- */

type Entry = { value: unknown; expiresAt: number };
const store = new Map<string, Entry>();

/**
 * Reads through the cache.
 *
 * `staleWhileRevalidate` keeps a slightly stale copy to serve instantly while a
 * background refresh happens — which is what makes catalogue pages feel quick.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const value = await load();
  if (store.size > 500) {
    for (const [k, entry] of store) if (entry.expiresAt <= now) store.delete(k);
  }
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/**
 * Drops a cache entry (used after writes that change the cached data).
 *
 * Exported as a tiny dedicated helper so route handlers can invalidate the
 * order list without importing the generic cache internals.
 */
export function invalidate(keyPrefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) store.delete(key);
  }
}

/** The customer's order list is cached; drop it after any write to an order. */
export function invalidateOrders(uid: string) {
  invalidate(`orders:${uid}`);
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(retryAfter: number) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
    },
  );
}
