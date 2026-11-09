"use client";

import type { Product } from "@channel3/sdk/resources";
import type { SearchFetchInput, SearchPage } from "@/hooks/use-product-search";

export type ClientSearchResult = {
  products: Product[];
  nextPageToken?: string;
};

/** Browser-side search through our API proxy – never sees the API key. */
export async function fetchProductSearch(input: {
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  page_token?: string;
  base64_image?: string;
  image_url?: string;
}): Promise<ClientSearchResult> {
  const response = await fetch("/api/channel3/search", {
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
 * Adapter for the official Channel3 `ProductSearch` block's `fetchSearch` prop.
 * Its `SearchFetchInput` is camelCase; our proxy speaks the raw API shape.
 */
export const productSearchFetcher = async (input: SearchFetchInput): Promise<SearchPage> => {
  // Pagination continues the existing search from the opaque token.
  const result = input.pageToken
    ? await fetchProductSearch({ page_token: input.pageToken })
    : await fetchProductSearch({
      query: input.query,
      filters: input.filters as unknown as Record<string, unknown>,
      base64_image: input.base64Image,
      image_url: input.imageUrl,
    });

  return { products: result.products, nextPageToken: result.nextPageToken ?? null };
};
