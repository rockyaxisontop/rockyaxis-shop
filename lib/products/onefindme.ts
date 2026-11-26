import "server-only";

import { createHash } from "node:crypto";

import type { Price, Product, ProviderSearchInput, ProviderSearchOutput } from "./types";

/**
 * OneFindMe provider adapter — the ONLY module that knows OneFindMe exists.
 *
 * Verified against the live API (GET https://onefindme.com/api/search,
 * documented at https://onefindme.com/openapi.json):
 *
 *   { query, marketplace_query, country, currency, language,
 *     results: [ …AliExpress listings… ],
 *     ebay_results: [ { title, price, currency, shipping_cost, delivery_days,
 *                       ships_from, image, url } ],
 *     more }
 *
 * Notes that shaped this file:
 *   • `results` are AliExpress. We deliberately never read them — the store
 *     only ever collects eBay listings (`ebay_results`).
 *   • There is NO pagination: `page`, `offset`, `cursor`, `start`, `skip` are
 *     all ignored, and `max_results` is capped at 20 (asking for 40 still
 *     returns 20 AliExpress rows / at most ~8-20 eBay rows). So "next page" is
 *     implemented by varying the query (see {@link buildQueryVariants}); each
 *     variant surfaces a partially different set of eBay item ids, and the
 *     Firestore layer removes the overlap. This is the best supported
 *     alternative to pagination and is why results are de-duplicated rather
 *     than offset-paged.
 *   • eBay rows carry no explicit item id, but the affiliate URL contains the
 *     permanent one: https://www.ebay.com/itm/<itemId>?… → that id is our
 *     product id and Firestore document id.
 *   • No image search in the REST API, so `base64Image` / `imageUrl` are not
 *     forwarded (documented limitation, handled by the service layer).
 */

const SEARCH_ENDPOINT = "https://onefindme.com/api/search";
/** Hard upstream cap documented in the OpenAPI schema (1–20). */
export const MAX_UPSTREAM_RESULTS = 20;
/** How many query variants we're willing to walk for one "page". */
const MAX_QUERY_VARIANTS = 40;

export function defaultCountry(): string {
  return (process.env.ONEFINDME_COUNTRY ?? "US").trim().toUpperCase().slice(0, 2) || "US";
}

/* -------------------------------------------------------------------------- */
/* Identity                                                                   */
/* -------------------------------------------------------------------------- */

const ITEM_PATH = /\/itm\/(?:[^/]*\/)?(\d{6,})/i;

/** The permanent eBay item id from any eBay listing URL, or null. */
export function ebayItemIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = ITEM_PATH.exec(url);
  return match?.[1] ?? null;
}

/** eBay listing URL with all tracking/affiliate parameters stripped. */
export function canonicalEbayUrl(url: string): string {
  const id = ebayItemIdFromUrl(url);
  if (id) return `https://www.ebay.com/itm/${id}`;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

/**
 * Stable product/document id: the eBay item id when present, otherwise a hash
 * of the canonical listing URL. Never derived from the title, so the same
 * listing found through different categories or search terms is one document.
 */
export function productIdForUrl(url: string): string {
  const itemId = ebayItemIdFromUrl(url);
  if (itemId) return itemId;
  const hash = createHash("sha1").update(canonicalEbayUrl(url)).digest("hex");
  return `url-${hash.slice(0, 24)}`;
}

export function isEbayListingUrl(url: string): boolean {
  try {
    return /(^|\.)ebay\.[a-z.]+$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Mapping eBay → our Product shape                                           */
/* -------------------------------------------------------------------------- */

type EbayResult = {
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  shipping_cost?: number | null;
  delivery_days?: string | null;
  ships_from?: string | null;
  image?: string | null;
  url?: string | null;
};

type OneFindMeResponse = {
  query?: string;
  currency?: string;
  results?: unknown[];
  ebay_results?: EbayResult[] | null;
};

/**
 * Brands commonly leading an eBay listing title. Used only to populate the
 * small brand line the product cards already render; unmatched titles simply
 * have no brand, exactly like a listing without one.
 */
const KNOWN_BRANDS = [
  "Apple", "Samsung", "Sony", "LG", "Lenovo", "Dell", "HP", "ASUS", "Acer", "MSI",
  "Gigabyte", "Razer", "Logitech", "Microsoft", "Google", "Xiaomi", "Huawei", "OnePlus",
  "Nintendo", "Canon", "Nikon", "Fujifilm", "Panasonic", "Bose", "JBL", "Anker",
  "Intel", "AMD", "NVIDIA", "Corsair", "Kingston", "Seagate", "Western Digital",
  "Garmin", "GoPro", "Dyson", "Philips", "Bosch", "Makita", "Nike", "Adidas",
  "Puma", "Levi's", "Casio", "Seiko", "Citizen", "TCL", "Hisense", "Motorola",
  "Beats", "Sennheiser", "Audio-Technica", "SteelSeries", "HyperX", "TP-Link",
  "Netgear", "Epson", "Brother", "Instant Pot", "Ninja", "Keurig", "Hoover", "Shark",
] as const;

function detectBrand(title: string): string | null {
  const first = title.trim().split(/[\s,/|-]+/)[0]?.replace(/[^\p{L}\p{N}'.]/gu, "") ?? "";
  if (!first) return null;
  const lower = first.toLowerCase();
  return KNOWN_BRANDS.find((brand) => brand.toLowerCase() === lower) ?? null;
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "ebay.com";
  }
}

export type MapOptions = {
  /** Category the listing was discovered under (homepage row), if any. */
  category?: { key: string; title: string };
  /** Search term that surfaced it, if any. */
  searchTerm?: string;
};

/** Converts one eBay row into the storefront's canonical Product object. */
export function mapEbayResult(item: EbayResult, options: MapOptions = {}): Product | null {
  const title = item.title?.trim();
  const url = item.url?.trim();
  if (!title || !url) return null;
  if (!isEbayListingUrl(url)) return null; // eBay products only, always.

  const price = typeof item.price === "number" && Number.isFinite(item.price) ? item.price : null;
  const currency = (item.currency ?? "USD").toUpperCase();
  const id = productIdForUrl(url);
  const brand = detectBrand(title);

  const structured: Record<string, string[]> = {};
  if (item.ships_from) structured["Ships from"] = [item.ships_from];
  if (item.delivery_days) structured["Delivery"] = [`${item.delivery_days} days`];
  if (typeof item.shipping_cost === "number") {
    structured["Shipping"] = [item.shipping_cost === 0 ? "Free" : `${currency} ${item.shipping_cost}`];
  }

  const offerPrice: Price = { price: price ?? 0, compare_at_price: null, currency };

  return {
    id,
    title,
    description: null,
    brands: brand ? [{ id: brand.toLowerCase().replace(/\s+/g, "-"), name: brand }] : undefined,
    images: item.image
      ? [{ url: item.image, is_main_image: true, alt_text: title }]
      : [],
    category: options.category
      ? {
        slug: options.category.key,
        title: options.category.title,
        has_children: false,
        path: [{ slug: options.category.key, title: options.category.title }],
      }
      : null,
    gender: null,
    age: null,
    materials: null,
    key_features: null,
    offers:
      price != null
        ? [
          {
            url,
            domain: hostLabel(url),
            price: offerPrice,
            availability: "InStock",
            condition: "new",
          },
        ]
        : [],
    variants: null,
    structured_attributes: Object.keys(structured).length > 0 ? structured : {},
    ratings: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Query variants — the pagination substitute                                 */
/* -------------------------------------------------------------------------- */

/**
 * Refinements applied to page N (N ≥ 2). Each one is a *real* eBay search that
 * returns a partially different result set, which is how Load More keeps
 * discovering listings the API won't page through.
 */
const QUERY_REFINEMENTS = [
  "rtx",
  "ssd",
  "16gb",
  "17 inch",
  "amd ryzen",
  "intel i7",
  "144hz",
  "used",
  "refurbished",
  "touchscreen",
  "oled",
  "mini",
  "student",
  "workstation",
  "chromebook",
  "2 in 1",
  "lightweight",
  "i5",
  "core ultra",
  "gaming",
];

/** The upstream query used for the given 1-based page. Page 1 = the query itself. */
export function queryForPage(query: string, page: number): string {
  const base = query.trim();
  if (page <= 1) return base;
  const refinement = QUERY_REFINEMENTS[(page - 2) % QUERY_REFINEMENTS.length];
  const round = Math.floor((page - 2) / QUERY_REFINEMENTS.length);
  return round === 0 ? `${base} ${refinement}` : `${base} ${refinement} ${round + 1}`;
}

export function hasMorePages(page: number): boolean {
  return page < MAX_QUERY_VARIANTS;
}

/* -------------------------------------------------------------------------- */
/* Upstream call                                                              */
/* -------------------------------------------------------------------------- */

async function fetchUpstream(query: string, country: string, limit: number): Promise<OneFindMeResponse> {
  const params = new URLSearchParams({
    query,
    country,
    max_results: String(Math.min(Math.max(limit, 1), MAX_UPSTREAM_RESULTS)),
  });

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    // Search results move slowly; a short server-side cache keeps the free API
    // friendly without ever serving something stale for long.
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`OneFindMe search failed (${response.status})`);
  }

  return (await response.json()) as OneFindMeResponse;
}

/**
 * One provider request = one upstream page. Returns eBay products only, already
 * mapped to our canonical shape and de-duplicated within the page.
 */
export async function searchOneFindMe(input: ProviderSearchInput): Promise<ProviderSearchOutput> {
  const { query, page, limit, country } = input;
  const upstreamQuery = queryForPage(query, page);
  const payload = await fetchUpstream(upstreamQuery, country || defaultCountry(), limit);

  const seen = new Set<string>();
  const products: Product[] = [];

  // `payload.results` (AliExpress) is intentionally ignored.
  for (const row of payload.ebay_results ?? []) {
    const product = mapEbayResult(row, { searchTerm: query });
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    products.push(product);
  }

  return {
    products,
    // The API never says "no more results"; a page is "more" while the walk
    // stays within the variant budget.
    // `openapi.json` caps `max_results` at 20 and eBay listings come from a
    // separate list whose size we can't request, so an empty response ends the
    // walk instead of looping forever on nothing.
    hasMore: hasMorePages(page) && (products.length > 0 || page === 1),
  };
}

/**
 * Cheap, read-only lookup used by typeahead: same endpoint, no persistence.
 */
export async function previewOneFindMe(query: string, limit: number): Promise<Product[]> {
  const { products } = await searchOneFindMe({
    query,
    page: 1,
    limit,
    country: defaultCountry(),
  });
  return products;
}
