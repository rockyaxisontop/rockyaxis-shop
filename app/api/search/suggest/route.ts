import { NextResponse } from "next/server";

import { searchProducts } from "@/lib/channel3/products";
import { storePrice } from "@/lib/discount";

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
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 200;

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return NextResponse.json(cached.body, { headers: { "X-Cache": "hit" } });
  }

  try {
    const { products } = await searchProducts({ query, limit: 6 });
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
    return NextResponse.json(body);
  } catch {
    // Never break typing: an empty list is a fine answer.
    return NextResponse.json({ suggestions: [] });
  }
}
