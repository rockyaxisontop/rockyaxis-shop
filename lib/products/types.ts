/**
 * The ONE product shape the whole storefront speaks.
 *
 * This is a structural copy of the shape the frontend was already built
 * against (id, title, images, offers, variants, …), so no component, hook or
 * page had to change when the data source moved from Channel3 to OneFindMe.
 * Every provider adapter (see `lib/products/providers/*`) must return exactly
 * this shape, and everything persisted in Firestore uses it too — which is what
 * makes swapping providers later a one-file change.
 *
 * IMPORTANT: this file must stay free of provider/SDK imports. It is the
 * contract, not an implementation detail.
 */

export type OfferAvailabilityStatus = "InStock" | "OutOfStock";

export type ProductImage = {
  url: string;
  /** Background-removed square image; the UI falls back to `url`. */
  cleaned_url?: string | null;
  is_main_image?: boolean;
  shot_type?: string | null;
  alt_text?: string | null;
};

export type Price = {
  /** Current price of the listing, in `currency`. */
  price: number;
  /** Price before the listing's own discount, in `currency`. */
  compare_at_price?: number | null;
  currency: string;
};

export type ProductOffer = {
  url: string;
  /** Display host, e.g. `ebay.com`. */
  domain: string;
  price: Price;
  availability: OfferAvailabilityStatus;
  condition?: "new" | "used" | null;
  max_commission_rate?: number;
};

export type ProductBrand = { id: string; name: string };

export type CategoryRef = { slug: string; title: string };

export type CategorySummary = {
  slug: string;
  title: string;
  path?: CategoryRef[];
  has_children: boolean;
};

export type OptionValue = {
  label: string;
  exists: boolean;
  available?: OfferAvailabilityStatus | null;
  thumbnail_url?: string | null;
  product_id?: string | null;
};

export type VariantOption = { name: string; values: OptionValue[] };

export type Variants = {
  options: VariantOption[];
  selected: Array<{ name: string; label: string }>;
};

export type ProductRatings = { value: number; count: number; source_count: number };

/** Search filters the UI can produce (a subset of what the old API accepted). */
export type SearchFilters = {
  brand_ids?: string[] | null;
  gender?: "female" | "male" | null;
  conditions?: Array<"new" | "used">;
  age?: Array<"adult" | "kids" | "toddler" | "infant" | "newborn"> | null;
  price?: { min_price?: number; max_price?: number } | null;
  availability?: OfferAvailabilityStatus[];
  sale?: string | null;
  website_ids?: string[] | null;
  category_ids?: string[] | null;
  exclude_brand_ids?: string[] | null;
  exclude_website_ids?: string[] | null;
  exclude_category_ids?: string[] | null;
  colors?: { palette: Array<{ hex: string; percentage?: number }> } | null;
  attributes?: Record<string, string[] | null> | null;
  dimensions?: {
    length?: { unit: string; min?: number; max?: number };
    width?: { unit: string; min?: number; max?: number };
    height?: { unit: string; min?: number; max?: number };
    weight?: { unit: string; min?: number; max?: number };
  } | null;
};

export type Product = {
  /** Our stable product id — also the Firestore document id. */
  id: string;
  title: string;
  description?: string | null;
  brands?: ProductBrand[];
  images?: ProductImage[];
  category?: CategorySummary | null;
  gender?: string | null;
  age?: string | null;
  materials?: string[] | null;
  key_features?: string[] | null;
  colors?: Array<{ hex: string; percentage: number }>;
  offers?: ProductOffer[];
  variants?: Variants | null;
  structured_attributes?: Record<string, string[]>;
  ratings?: ProductRatings | null;
};

export type ProductSearchResult = {
  products: Product[];
  /** Opaque token for the next page; absent when there are no more results. */
  nextPageToken?: string;
};

export type ProductSearchParams = {
  query?: string;
  filters?: SearchFilters;
  limit?: number;
  pageToken?: string;
  base64Image?: string;
  imageUrl?: string;
};

/** What a provider adapter has to implement to power the storefront. */
export type ProductProviderId = "onefindme";

export type ProviderSearchInput = {
  query: string;
  /** 1-based page requested for this query. */
  page: number;
  /** How many products to ask the upstream for. */
  limit: number;
  country: string;
};

export type ProviderSearchOutput = {
  products: Product[];
  /** False when the provider has no further results for this query. */
  hasMore: boolean;
};

/* -------------------------------------------------------------------------- */
/* Filter-side types                                                          */
/*                                                                            */
/* The filter UI (components/product-filters.tsx / lib/search.ts) is untouched */
/* and still speaks these shapes, so they are kept here verbatim. eBay data    */
/* simply leaves the fields our provider cannot fill empty.                    */
/* -------------------------------------------------------------------------- */

export type Brand = {
  id: string;
  name: string;
  logo_url?: string | null;
  description?: string | null;
  best_commission_rate?: number;
};

export type Website = {
  id: string;
  name?: string | null;
  url: string;
  logo_url?: string | null;
  description?: string | null;
  best_commission_rate?: number;
  countries?: string[];
};

export type CategoryAttribute = {
  slug: string;
  name: string;
  values?: string[];
};

export type Category = CategorySummary & {
  description?: string | null;
  children?: CategoryRef[];
  attributes?: CategoryAttribute[];
};

export type PriceStatistics = {
  mean: number;
  std_dev: number;
  min_price: number;
  max_price: number;
  current_price: number;
  current_status: string;
  currency: string;
};

export type PriceHistoryPoint = { timestamp: Date; price: number; currency: string };

export type PriceHistoryResponse = {
  canonical_product_id: string;
  product_title?: string | null;
  history?: PriceHistoryPoint[];
  statistics?: PriceStatistics | null;
};
