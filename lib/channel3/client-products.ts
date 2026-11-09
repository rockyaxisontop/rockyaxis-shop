"use client";

import type { OptionValue, Product } from "@channel3/sdk/resources";
import type { VariantResolveInput } from "@/hooks/use-variant-selection";
import type { SimilarFetchInput } from "@/hooks/use-product-recommendations";

/** VariantResolver for `useVariantSelection` – key stays on the server. */
export async function resolveVariant({
  product,
  value,
  selection,
}: VariantResolveInput): Promise<Product> {
  // A swatch may point to its own canonical product id; otherwise re-resolve
  // the current product with the chosen options.
  const productId = value.product_id ?? product.id;
  const selected_options = value.product_id ? undefined : selection;

  const response = await fetch(`/api/channel3/products/${encodeURIComponent(productId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selected_options }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Couldn't load that variant");
  }

  return (await response.json()) as Product;
}

/** SimilarFetcher for `ProductDetails`' recommendations carousel. */
export async function fetchSimilarProducts({ productId, limit }: SimilarFetchInput): Promise<Product[]> {
  const response = await fetch(
    `/api/channel3/products/${encodeURIComponent(productId)}/similar?limit=${limit}`,
  );

  if (!response.ok) return [];

  const body = (await response.json()) as { products?: Product[] };
  return body.products ?? [];
}

export type { OptionValue };
