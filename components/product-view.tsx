"use client";

import type { Product } from "@channel3/sdk/resources";

import { ProductDetails } from "@/components/product-details";
import { ProductRecommendations } from "@/components/product-recommendations";
import { useVariantSelection } from "@/hooks/use-variant-selection";
import { fetchSimilarProducts, resolveVariant } from "@/lib/channel3/client-products";

/**
 * Official Channel3 `product-details` block with live variant resolution.
 * All fetches go through /api/channel3/* so the API key stays server-side.
 */
export function ProductView({ product }: { product: Product }) {
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
