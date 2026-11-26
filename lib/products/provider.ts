import "server-only";

import { previewOneFindMe, searchOneFindMe } from "./onefindme";
import type { Product, ProductProviderId, ProviderSearchInput, ProviderSearchOutput } from "./types";

/**
 * Product-provider registry.
 *
 * This is the seam that makes future replacement cheap: the rest of the app
 * (catalogue service, API routes, Firestore store, and therefore every page and
 * component) only ever talks to {@link ProductProvider}. To add another
 * provider, write one adapter that maps its response into `Product` (see
 * `lib/products/types.ts`) and register it below — nothing else changes.
 */

export type ProductProvider = {
  id: ProductProviderId;
  /** One upstream page of eBay products for a query. */
  search(input: ProviderSearchInput): Promise<ProviderSearchOutput>;
  /** Read-only preview used by typeahead; never persists anything. */
  preview(query: string, limit: number): Promise<Product[]>;
  /** Capabilities the UI/service must know about. */
  supportsImageSearch: boolean;
  supportsPagination: boolean;
};

const oneFindMe: ProductProvider = {
  id: "onefindme",
  search: searchOneFindMe,
  preview: previewOneFindMe,
  // The REST API takes text only (no image upload endpoint).
  supportsImageSearch: false,
  // No page/cursor/offset parameters; Load More walks query variants instead.
  supportsPagination: false,
};

const PROVIDERS: Record<ProductProviderId, ProductProvider> = {
  onefindme: oneFindMe,
};

/**
 * The configured provider. `PRODUCT_PROVIDER` selects one; the default keeps
 * existing deployments working without a new env var.
 */
export function getProductProvider(): ProductProvider {
  const configured = (process.env.PRODUCT_PROVIDER ?? "onefindme").trim().toLowerCase();
  const provider = PROVIDERS[configured as ProductProviderId];
  return provider ?? oneFindMe;
}

export type { ProductProviderId };
