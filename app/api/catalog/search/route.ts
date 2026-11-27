import { NextResponse } from "next/server";

import { searchProducts } from "@/lib/products/service";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/server/guard";

/**
 * Search proxy used by the storefront's search block.
 *
 *   POST /api/catalog/search
 *   { query, filters, limit, page_token, base64_image, image_url }
 *
 * Each call discovers eBay listings through the configured provider, stores the
 * new ones in Firestore, and returns only unique products. `page_token` continues
 * the same search (see `lib/products/service.ts` — Load More).
 */
export async function POST(request: Request) {
  let body: {
    query?: string;
    filters?: Record<string, unknown>;
    limit?: number;
    page_token?: string;
    base64_image?: string;
    image_url?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.query?.trim() && !body.page_token && !body.base64_image && !body.image_url && !body.filters) {
    return NextResponse.json({ error: "A query, image, filters or page_token is required" }, { status: 400 });
  }

  // Every search costs an upstream request and Firestore writes: cap per caller.
  const limit = rateLimit(`search:${clientKey(request)}`, 30, 60_000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  try {
    const result = await searchProducts({
      query: body.query,
      filters: body.filters,
      limit: Math.min(body.limit ?? 20, 20),
      pageToken: body.page_token,
      base64Image: body.base64_image,
      imageUrl: body.image_url,
    });

    // A repeat of the same query+page is served from memory for a few minutes.
    // Load More must never be cached (each page is new by design), so only the
    // first page gets a shared cache entry.
    const isFirstPage = !body.page_token;
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": isFirstPage
          ? "public, max-age=60, stale-while-revalidate=300"
          : "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
