import { NextResponse } from "next/server";

import { suggestProducts } from "@/lib/products/service";
import { storePrice } from "@/lib/discount";
import { cached, clientKey, rateLimit, tooManyRequests } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/suggest?q=head
 *
 * Typeahead suggestions for the header search box.
 *
 * Deliberately tiny: 6 results, only the fields a dropdown renders (id, title,
 * image, price), and an in-memory cache so repeated prefixes cost nothing. The
 * full catalogue objects would make typing feel sluggish.
 */
const cache = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 300;

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  // Typeahead is the easiest way to burn upstream requests: cap it per IP.
  const limit = rateLimit(`suggest:${clientKey(request)}`, 40, 60_000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.body, {
      headers: { "X-Cache": "hit", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  }

  try {
    // Typeahead previews straight from the provider and saves nothing — a
    // Firestore write per keystroke would be wasteful and rate-limit prone.
    const products = await cached(`suggest:${key}`, TTL_MS, () =>
      suggestProducts(query, 6),
    );
    const suggestions = products.slice(0, 6).map((product) => {
      const offer =
        product.offers?.find((item) => item.availability === "InStock") ?? product.offers?.[0];
      return {
        id: product.id,
        title: product.title,
        image: product.images?.[0]?.url ?? null,
        brand: product.brands?.[0]?.name ?? null,
        price: offer?.price?.price != null ? Math.round(storePrice(offer.price.price) * 100) / 100 : null,
        currency: offer?.price?.currency ?? "USD",
      };
    });

    const body = { suggestions };
    if (cache.size > MAX_ENTRIES) cache.clear();
    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  } catch {
    // Never break typing: an empty list is a fine answer.
    return NextResponse.json({ suggestions: [] });
  }
}
