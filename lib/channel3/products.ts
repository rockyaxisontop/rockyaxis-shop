import "server-only";

import type { Product } from "@channel3/sdk/resources";

import { getChannel3 } from "./server";

export type ProductSearchParams = {
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  pageToken?: string;
  base64Image?: string;
  imageUrl?: string;
};

export type ProductSearchResult = {
  products: Product[];
  nextPageToken?: string;
};

/**
 * Server-side product search. `getChannel3()` is imported inside the function
 * on purpose: `app/api` / route files need to be analyzable without a key.
 */
export async function searchProducts({
  query,
  filters,
  limit = 20,
  pageToken,
  base64Image,
  imageUrl,
}: ProductSearchParams): Promise<ProductSearchResult> {
  const client = getChannel3();

  const params = {
    query: query?.trim() ? query.trim() : undefined,
    filters: filters as never,
    limit,
    page_token: pageToken,
    base64_image: base64Image,
    image_url: imageUrl,
  };

  const response = await client.products.search(params);

  const page = response as unknown as {
    products?: Product[];
    data?: Product[];
    next_page_token?: string | null;
    nextPageToken?: string | null;
  };

  return {
    products: page.products ?? page.data ?? [],
    nextPageToken: page.next_page_token ?? page.nextPageToken ?? undefined,
  };
}

export async function getProduct(
  productId: string,
  options?: { region?: string; selected_options?: Record<string, string> },
): Promise<Product> {
  const client = getChannel3();
  return client.products.retrieve({ product_id: productId, ...options });
}

export async function getSimilarProducts(productId: string, limit = 12): Promise<Product[]> {
  const client = getChannel3();
  const page = await client.products.findSimilar({ product_id: productId, limit });
  return page.data;
}
