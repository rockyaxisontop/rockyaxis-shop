"use client";

import type { Product } from "@/lib/products/types";

import { ProductDetails } from "@/components/product-details";
import { ProductRecommendations } from "@/components/product-recommendations";
import { useVariantSelection } from "@/hooks/use-variant-selection";
import { fetchSimilarProducts, resolveVariant } from "@/lib/products/client-products";

/**
 * Official `product-details` block with variant resolution.
 * All fetches go through /api/catalog/*, backed by the configured provider.
 */
export function ProductView({ product, currency }: { product: Product; currency?: string }) {
  const { product: activeProduct, selection, isResolving, select } = useVariantSelection({
    product,
    resolve: resolveVariant,
  });

  const handleSelectVariant = (_optionName: string, value: Parameters<typeof select>[1]) => {
    select(_optionName, value);
  };

  return (
    <ProductDetails
      product={activeProduct}
      currency={currency}
      selection={selection}
      isResolving={isResolving}
      onSelectVariant={handleSelectVariant}
      buyLinkRel="sponsored noopener noreferrer"
    />
  );
}

export function ProductRecommendationsView({ productId }: { productId: string }) {
  return (
    <ProductRecommendations
      productId={productId}
      fetchSimilar={fetchSimilarProducts}
      limit={12}
      title="You might also like"
    />
  );
}
