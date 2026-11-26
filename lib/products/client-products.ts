"use client";

import type { SimilarFetchInput } from "@/hooks/use-product-recommendations";
import type { VariantResolveInput } from "@/hooks/use-variant-selection";
import type { OptionValue, Product } from "@/lib/products/types";

/** VariantResolver for `useVariantSelection`. */
export async function resolveVariant({
  product,
  value,
  selection,
}: VariantResolveInput): Promise<Product> {
  // eBay listings have no variant-matrix endpoint: a swatch may point at another
  // stored listing, otherwise the current product is already the answer.
  const productId = value.product_id ?? product.id;
  if (productId === product.id) return product;

  void selection;
  const response = await fetch(`/api/catalog/products/${encodeURIComponent(productId)}`);

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Couldn't load that variant");
  }

  return (await response.json()) as Product;
}

/** SimilarFetcher for `ProductDetails`' recommendations carousel. */
export async function fetchSimilarProducts({ productId, limit }: SimilarFetchInput): Promise<Product[]> {
  const response = await fetch(
    `/api/catalog/products/${encodeURIComponent(productId)}/similar?limit=${limit}`,
  );

  if (!response.ok) return [];

  const body = (await response.json()) as { products?: Product[] };
  return body.products ?? [];
}

export type { OptionValue };
