import "server-only";

import { defaultCountry, queryForPage } from "./onefindme";
import { getProductProvider } from "./provider";
import {
  dedupe,
  findProductsByCategory,
  findProductsByTerm,
  getProductById,
  getProductsByIds,
  persistProducts,
  recentProducts,
  type TermScope,
} from "./store";
import type { Product, ProductSearchParams, ProductSearchResult } from "./types";

/**
 * Catalogue service — the single place the rest of the app loads products from.
 *
 * It owns the flow the storefront needs:
 *   1. ask the configured provider for a page of eBay listings,
 *   2. drop anything Firestore already has (dedupe by product id),
 *   3. save the new ones and record their category/search-term associations,
 *   4. top the page up from Firestore so it fills the same grid it always did.
 *
 * Pages and API routes import from here; nothing downstream knows which
 * provider is active.
 */

/** The categories the homepage and /search suggestions are built from. */
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

export type SuggestedGroupKey = (typeof SUGGESTED_GROUPS)[number]["key"];
export type SuggestedGroup = { key: string; title: string; query: string; products: Product[] };

/** Max products held per category index — the homepage "catalogue" size. */
const CATEGORY_TARGET = 120;
const PAGE_SIZE = 20;
/** Refinements worth trying in a single request before returning what we have. */
const TOP_UP_ATTEMPTS = 3;

const currencyCountry = () => defaultCountry();

/** Products saved for one category, newest first (read-only; never calls out). */
async function categoryFromStore(key: string, limit: number): Promise<Product[]> {
  return findProductsByCategory(key, limit);
}

/**
 * Discovers eBay listings for one homepage category and stores them.
 *
 * `page` is 1-based: page 1 is the category's own query, later pages walk the
 * provider's refinement variants so a category keeps growing over time instead
 * of re-saving the same listings.
 */
export async function discoverCategoryProducts(
  key: string,
  query: string,
  page: number,
  limit = PAGE_SIZE,
): Promise<Product[]> {
  const provider = getProductProvider();
  const scope: TermScope = { kind: "category", value: key };

  try {
    const { products } = await provider.search({
      query,
      page,
      limit,
      country: currencyCountry(),
    });

    const saved = await persistProducts(dedupe(products), scope, {
      indexScopes: [{ kind: "search", value: query }],
    });
    return saved;
  } catch (error) {
    console.error(`OneFindMe category discovery failed for "${key}":`, error);
    return [];
  }
}

/**
 * A homepage category row: reuses stored products and, when the category is
 * still thin, discovers more. Never throws — an empty row is handled by the
 * existing "temporarily unavailable" notice in the page.
 */
export async function getCategoryProducts(
  key: string,
  query: string,
  limit: number,
): Promise<Product[]> {
  const before = await categoryFromStore(key, CATEGORY_TARGET);
  const products = await getProductsByIds(before.map((product) => product.id));
  const seen = new Set(products.map((product) => product.id));
  const result = products.filter((product) => (product.offers?.length ?? 0) > 0);

  const missing = limit > 0 ? limit - result.length : 0;
  if (missing > 0) {
    // Discover in small pages until the row can be filled.
    for (let page = 1; page <= 3 && result.length < limit; page += 1) {
      const fresh = await discoverCategoryProducts(key, query, page, PAGE_SIZE);
      for (const product of dedupe(fresh)) {
        if (seen.has(product.id) || (product.offers?.length ?? 0) === 0) continue;
        seen.add(product.id);
        result.push(product);
        if (result.length >= limit) break;
      }
    }
  }

  return result.slice(0, Math.max(limit, 0));
}

/**
 * Homepage / search-suggestion rows. Runs the categories in parallel, skips the
 * ones that fail, and never returns an empty group (same contract as before).
 */
export async function getSuggestedProducts(
  limit = 8,
  groupKeys?: readonly SuggestedGroupKey[],
): Promise<SuggestedGroup[]> {
  const groups = groupKeys
    ? SUGGESTED_GROUPS.filter(({ key }) => groupKeys.includes(key))
    : SUGGESTED_GROUPS;

  const results = await Promise.all(
    groups.map(async ({ key, title, query }) => {
      try {
        const products = await getCategoryProducts(key, query, limit);
        return { key, title, query, products };
      } catch (error) {
        console.error(`Homepage row "${key}" failed:`, error);
        return { key, title, query, products: [] as Product[] };
      }
    }),
  );

  return results.filter((group) => group.products.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Customer search + Load More                                                */
/* -------------------------------------------------------------------------- */

function encodePageToken(page: number): string {
  return `p${page}`;
}

function pageFromToken(token: string | undefined): number {
  const match = /^p(\d+)$/.exec(token ?? "");
  const page = match ? Number(match[1]) : 1;
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

/**
 * Customer search. Page 1 fetches 20 eBay listings, saves the new ones and
 * returns them; every later page (Load More) walks the next query variant,
 * skips listings Firestore already knows, saves the rest and returns those —
 * so each request adds unique products instead of repeating the first 20.
 */
export async function searchProducts({
  query,
  filters,
  limit = PAGE_SIZE,
  pageToken,
  base64Image,
  imageUrl,
}: ProductSearchParams): Promise<ProductSearchResult> {
  const term = query?.trim() ?? "";
  const page = pageFromToken(pageToken);
  const size = Math.min(Math.max(limit || PAGE_SIZE, 1), 20);
  const provider = getProductProvider();

  if (!provider.supportsImageSearch && (base64Image || imageUrl)) {
    // Documented limitation: OneFindMe's REST API is text-only. Text still wins
    // when the shopper typed something, else the request yields nothing.
    if (!term) return { products: [] };
  }

  const text = term || (filters ? "products" : "");
  if (!text) return { products: [] };

  const scope: TermScope = { kind: "search", value: text };

  // One upstream call per page. Page 1 is the query itself; later pages are
  // further refinements of the same query that return a partly different set
  // of eBay listings.
  const fetchPage = async (targetPage: number): Promise<{ products: Product[]; hasMore: boolean }> => {
    const output = await provider.search({
      query: text,
      page: targetPage,
      limit: size,
      country: currencyCountry(),
    });
    return { products: output.products, hasMore: output.hasMore };
  };

  let pageIndex = page;
  let fresh: Product[] = [];
  let hasMore = false;

  // Keep refining until this request can fill a page with listings nobody has
  // seen yet. When the catalogue for a term is already exhausted upstream, the
  // walk falls back to stored products instead of returning an empty page.
  for (let attempt = 0; attempt < TOP_UP_ATTEMPTS; attempt += 1) {
    try {
      const output = await fetchPage(pageIndex);
      hasMore = output.hasMore;
      fresh = await persistProducts(dedupe(output.products), scope);
    } catch (error) {
      console.error(`OneFindMe search failed for "${text}":`, error);
      fresh = [];
    }

    const usable = fresh.filter((product) => (product.offers?.length ?? 0) > 0);
    if (usable.length > 0 || !hasMore) break;
    pageIndex += 1;
  }

  const usable = (product: Product) => (product.offers?.length ?? 0) > 0;

  // Newly discovered listings first — that is what makes Load More visibly add
  // products. Already-stored ones fill the rest of the page.
  const combined: Product[] = [];
  const seen = new Set<string>();
  for (const product of fresh.filter(usable)) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    combined.push(product);
  }

  if (combined.length < size) {
    const stored = await findProductsByTerm(scope, size * 3);
    for (const product of stored.filter(usable)) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      combined.push(product);
      if (combined.length >= size) break;
    }
  }

  return {
    products: combined,
    // Continue the walk from wherever this request stopped, so Load More keeps
    // discovering new refinements instead of re-walking the same ones.
    nextPageToken: fresh.length > 0 || hasMore ? encodePageToken(pageIndex + 1) : undefined,
  };
}

/** Typeahead: live, unpersisted preview from the provider. */
export async function suggestProducts(query: string, limit = 6): Promise<Product[]> {
  const provider = getProductProvider();
  try {
    const products = await provider.preview(query.trim(), Math.min(limit, 10));
    return dedupe(products);
  } catch (error) {
    console.error(`OneFindMe suggestions failed for "${query}":`, error);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Product detail + recommendations                                           */
/* -------------------------------------------------------------------------- */

/**
 * Product page data. Products are stored at discovery time, so this is a plain
 * Firestore read. eBay listings have no variant matrix, so there is nothing to
 * re-resolve.
 */
export async function getProduct(productId: string): Promise<Product> {
  const product = await getProductById(productId);
  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }
  return product;
}

/**
 * "You might also like": stored products that share the product's category or
 * brand, topped up with what its search terms already surfaced, then recent
 * products. Never calls the provider, so it is free and instant.
 */
export async function getSimilarProducts(productId: string, limit = 12): Promise<Product[]> {
  try {
    const product = await getProductById(productId);
    if (!product) return [];

    const candidates: Product[] = [];
    const categorySlug = product.category?.slug;
    if (categorySlug) candidates.push(...(await findProductsByCategory(categorySlug, limit * 2)));

    const brand = product.brands?.[0]?.name;
    if (brand) candidates.push(...(await findProductsByTerm({ kind: "search", value: brand }, limit)));

    if (candidates.length < limit) candidates.push(...(await recentProducts(limit * 3)));

    const seen = new Set<string>([productId]);
    const picks: Product[] = [];
    for (const candidate of candidates) {
      if (seen.has(candidate.id)) continue;
      if ((candidate.offers?.length ?? 0) === 0) continue;
      seen.add(candidate.id);
      picks.push(candidate);
      if (picks.length >= limit) break;
    }
    return picks;
  } catch (error) {
    console.error(`Similar products failed for ${productId}:`, error);
    return [];
  }
}

/** The upstream query a page token walks, exposed for diagnostics. */
export function providerQueryFor(query: string, page: number): string {
  return queryForPage(query, page);
}
