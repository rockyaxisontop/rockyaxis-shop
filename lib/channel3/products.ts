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

/**
 * Daily-life product ideas shown before the user searches (the "for you" feed).
 * Grouped so the empty state looks like a real shop, not one random list.
 */
export const SUGGESTED_GROUPS = [
  { key: "trending", title: "Trending right now", query: "trending products" },
  { key: "home", title: "Home & kitchen", query: "home kitchen essentials" },
  { key: "fashion", title: "Everyday fashion", query: "everyday clothing basics" },
  { key: "tech", title: "Tech & gadgets", query: "phones headphones smartwatch" },
  { key: "beauty", title: "Beauty & self-care", query: "skincare beauty products" },
  { key: "sports", title: "Fitness & outdoors", query: "fitness outdoor gear" },
  { key: "audio", title: "Audio & entertainment", query: "headphones speakers audio" },
  { key: "gaming", title: "Gaming & accessories", query: "gaming console accessories" },
  { key: "cameras", title: "Cameras & photography", query: "cameras photography" },
] as const;

export type SuggestedGroup = { key: string; title: string; query: string; products: Product[] };

/** Runs the suggestion queries in parallel; failures are skipped, not thrown. */
export async function getSuggestedProducts(
  limit = 8,
  groupKeys?: readonly (typeof SUGGESTED_GROUPS)[number]["key"][],
): Promise<SuggestedGroup[]> {
  const groups = groupKeys
    ? SUGGESTED_GROUPS.filter(({ key }) => groupKeys.includes(key))
    : SUGGESTED_GROUPS;
  const results = await Promise.all(
    groups.map(async ({ key, title, query }) => {
      try {
        const { products } = await searchProducts({ query, limit });
        return { key, title, query, products };
      } catch {
        return { key, title, query, products: [] as Product[] };
      }
    }),
  );

  return results.filter((group) => group.products.length > 0);
}

export async function getSimilarProducts(productId: string, limit = 12): Promise<Product[]> {
  const client = getChannel3();
  const similar = await client.products
    .findSimilar({ product_id: productId, limit })
    .then((page) => page.data ?? [])
    .catch(() => [] as Product[]);
  const recommendations = new Map<string, Product>();

  for (const product of similar) {
    if (product.id !== productId) recommendations.set(product.id, product);
  }
  if (recommendations.size >= limit) return [...recommendations.values()].slice(0, limit);

  let product: Product;
  try {
    product = await client.products.retrieve({ product_id: productId });
  } catch {
    return [...recommendations.values()].slice(0, limit);
  }

  const brand = product.brands?.[0]?.name;
  const category = product.category?.title;
  const queries = [...new Set([
    [brand, category].filter(Boolean).join(" "),
    category,
    brand,
    product.title.split(/\s+/).slice(0, 3).join(" "),
  ].filter((query): query is string => Boolean(query?.trim())))];

  for (const query of queries) {
    if (recommendations.size >= limit) break;
    try {
      const { products } = await searchProducts({ query, limit: Math.min(30, limit * 2) });
      for (const candidate of products) {
        if (candidate.id !== productId && !recommendations.has(candidate.id)) {
          recommendations.set(candidate.id, candidate);
          if (recommendations.size >= limit) break;
        }
      }
    } catch {
      continue;
    }
  }

  return [...recommendations.values()].slice(0, limit);
}
