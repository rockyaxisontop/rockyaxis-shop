"use client";

import type { SearchFetchInput, SearchPage } from "@/hooks/use-product-search";
import type { Product } from "@/lib/products/types";

export type ClientSearchResult = {
  products: Product[];
  nextPageToken?: string;
};

/**
 * Browser-side search through our API proxy.
 *
 * The proxy talks to the configured product provider (OneFindMe today) and
 * persists what it discovers in Firestore, so the browser never sees a provider
 * key and the wire format never changes when the provider does.
 */
export async function fetchProductSearch(input: {
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  page_token?: string;
  base64_image?: string;
  image_url?: string;
}): Promise<ClientSearchResult> {
  const response = await fetch("/api/catalog/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Search failed (${response.status})`);
  }

  return (await response.json()) as ClientSearchResult;
}

/**
 * Adapter for the `ProductSearch` block's `fetchSearch` prop. Its
 * `SearchFetchInput` is camelCase; our proxy speaks the raw API shape.
 */
export const productSearchFetcher = async (input: SearchFetchInput): Promise<SearchPage> => {
  // The token names the next page of the walk; the proxy resolves it, skips
  // listings already stored, and returns only newly discovered products.
  const result = input.pageToken
    ? await fetchProductSearch({ page_token: input.pageToken, query: input.query })
    : await fetchProductSearch({
      query: input.query,
      filters: input.filters as unknown as Record<string, unknown>,
      base64_image: input.base64Image,
      image_url: input.imageUrl,
    });

  return { products: result.products, nextPageToken: result.nextPageToken ?? null };
};
