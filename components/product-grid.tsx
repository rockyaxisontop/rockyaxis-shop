import * as React from "react";
import type { OptionValue, Product } from "@/lib/products/types";

import { cn } from "@/lib/utils";
import { isAdCell, withInFeedAds } from "@/lib/ad-cells";
import { AdSlot } from "@/components/ad-slot";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";

export interface ProductGridProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  products: ReadonlyArray<Product>;
  getHref?: (product: Product) => string;
  onSelect?: (product: Product) => void;
  onPreload?: (product: Product) => void;
  onSelectVariant?: (product: Product, value: OptionValue) => void;
  showSwatches?: boolean;
  loading?: boolean;
  skeletonCount?: number;
  emptyState?: React.ReactNode;
  locale?: string;
  /**
   * Drops a sponsored card into the grid every `adsEvery` tiles. Off by default
   * so the homepage rows stay untouched; search results opt in.
   */
  adsEvery?: number;
  /** Rotates which partner creative the cards use, so a page doesn't repeat one. */
  adCreatives?: number;
}

const PRIORITY_COUNT = 4;

export function ProductGrid({
  products,
  getHref,
  onSelect,
  onPreload,
  onSelectVariant,
  showSwatches = true,
  loading = false,
  skeletonCount = 8,
  emptyState,
  locale,
  adsEvery = 0,
  adCreatives = 0,
  className,
  ...props
}: ProductGridProps) {
  const gridClass = cn(
    // Phone: 2 comfortable columns with tight gutters; wider screens open up.
    "grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-4 sm:gap-y-8 sm:grid-cols-3 lg:grid-cols-4",
    className,
  );

  // Sponsored tiles sit in the normal grid flow, so the layout never jumps and
  // a row keeps exactly the same footprint it had before. With few results the
  // first break lands earlier, so a short page still carries one unit.
  const cells =
    adsEvery > 0 ? withInFeedAds(products, products.length > adsEvery ? adsEvery : 4) : products;

  if (loading) {
    return (
      <div data-slot="product-grid" className={gridClass} {...props}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div data-slot="product-grid" {...props}>
        {emptyState ?? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No products found</EmptyTitle>
              <EmptyDescription>Try a different search or adjust your filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    );
  }

  return (
    <div data-slot="product-grid" className={gridClass} {...props}>
      {cells.map((cell, index) => {
        if (isAdCell(cell)) {
          return (
            <AdSlot
              key={`ad-${index}`}
              variant="banner-row"
              creative={adCreatives + cell.__ad}
              className="min-w-0"
            />
          );
        }
        return (
          <ProductCard
            key={cell.id}
            product={cell}
            href={getHref ? getHref(cell) : `/products/${encodeURIComponent(cell.id)}`}
            onSelect={onSelect}
            onPreload={onPreload}
            onSelectVariant={onSelectVariant ? (value) => onSelectVariant(cell, value) : undefined}
            showSwatches={showSwatches}
            priority={index < PRIORITY_COUNT}
            locale={locale}
          />
        );
      })}
    </div>
  );
}
