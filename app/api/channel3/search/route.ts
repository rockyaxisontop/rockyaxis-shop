import { NextResponse } from "next/server";

import { searchProducts } from "@/lib/channel3/products";
import { cached, clientKey, rateLimit, tooManyRequests } from "@/lib/server/guard";

/**
 * Proxy used by client components (e.g. the Channel3 ProductSearch block) to
 * run searches without exposing the API key. The official components are
 * presentational and accept a `fetchSearch` fetcher — point it here.
 *
 *   POST /api/channel3/search
 *   { query, filters, limit, page_token, base64_image, image_url }
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

  // Every search spends Channel3 credits, so cap it per caller.
  const limit = rateLimit(`search:${clientKey(request)}`, 20, 60_000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  // Identical searches (common with typeahead and pagination) are served from
  // memory instead of spending another credit.
  const cacheKey = `search:${JSON.stringify({ q: body.query, f: body.filters, t: body.page_token }).slice(0, 400)}`;

  try {
    const result = await cached(cacheKey, 10 * 60 * 1000, () =>
      searchProducts({
        query: body.query,
        filters: body.filters,
        limit: Math.min(body.limit ?? 20, 30),
        pageToken: body.page_token,
        base64Image: body.base64_image,
        imageUrl: body.image_url,
      }),
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Channel3 search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
