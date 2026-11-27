import "server-only";

import { defaultCountry, queryForPage } from "./onefindme";
import { getProductProvider } from "./provider";
import {
  dedupe,
  findProductsByCategory,
  findProductsByTerm,
  getProductById,
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

const currencyCountry = () => defaultCountry();

/**
 * Products saved for one category.
 *
 * One `array-contains` query instead of "read the index, then read every
 * product in it" — the old shape cost up to N+1 Firestore reads per row on every
 * page load. See {@link findProductsByCategory}.
 */
async function loadStoredCategory(key: string, limit = CATEGORY_TARGET): Promise<Product[]> {
  try {
    return await findProductsByCategory(key, limit);
  } catch (error) {
    console.error(`Could not read stored products for "${key}":`, error);
    return [];
  }
}

/**
 * Discovers eBay listings for one homepage category and stores them.
 *
 * `page` is 1-based: page 1 is the category's own query, later pages walk the
 * provider's refinement variants so a category keeps growing over time instead
 * of re-saving the same listings.
 *
 * Returning provider products must never depend on persistence: Firestore can
 * be unavailable (quota, outage) and the homepage row still has to render.
 */
export async function discoverCategoryProducts(
  key: string,
  query: string,
  page: number,
  limit = PAGE_SIZE,
): Promise<Product[]> {
  const provider = getProductProvider();
  const scope: TermScope = { kind: "category", value: key };

  let found: Product[];
  try {
    const { products } = await provider.search({
      query,
      page,
      limit,
      country: currencyCountry(),
    });
    found = dedupe(products);
  } catch (error) {
    console.error(`Product discovery failed for "${key}":`, error);
    return [];
  }

  // Best-effort persistence, not awaited: saving enriches the catalogue over
  // time, but must never add latency to the page or hide products we have.
  if (found.length > 0) {
    void persistProducts(found, scope, {
      indexScopes: [{ kind: "search", value: query }],
    }).catch((error: unknown) => {
      console.error(`Could not store products for "${key}" (continuing):`, error);
    });
  }

  return found;
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
  // The stored row and a fresh upstream page are fetched AT THE SAME TIME.
  // Sequentially, every cold row paid store latency *then* provider latency;
  // in parallel the row costs whichever is slower, not the sum.
  //
  // `discoverCategoryProducts` never throws and does not wait on persistence.
  const [fromStore, fresh] = await Promise.all([
    loadStoredCategory(key),
    limit > 0 ? discoverCategoryProducts(key, query, 1, PAGE_SIZE) : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const result: Product[] = [];
  const push = (product: Product) => {
    if (seen.has(product.id)) return;
    if ((product.offers?.length ?? 0) === 0) return;
    seen.add(product.id);
    result.push(product);
  };

  // Stored products first (they are the ones we chose to keep), then whatever
  // this request just discovered to top the row up.
  fromStore.forEach(push);
  fresh.forEach(push);

  const row = result.slice(0, Math.max(limit, 0));
  rememberProducts(row);
  return row;
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

/**
 * Page token = page number + the ids already shown, packed as JSON then
 * base64url.
 *
 * Carrying the seen ids in the token is what lets Load More skip repeats without
 * reading Firestore: the browser sends back what it has, the server returns only
 * products not in that list. A token is opaque to the client, bounded (it stops
 * growing once it reaches SEEN_CAP), and if it is missing/corrupt we simply
 * behave like page 1.
 */
const SEEN_CAP = 160;

type PageState = { page: number; seen: string[] };

function encodePageToken(page: number, seen: string[]): string {
  const payload: PageState = { page, seen: seen.slice(-SEEN_CAP) };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function pageFromToken(token: string | undefined): PageState {
  if (!token) return { page: 1, seen: [] };
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Partial<PageState>;
    const page = Number(parsed.page);
    const seen = Array.isArray(parsed.seen) ? parsed.seen.filter((id): id is string => typeof id === "string") : [];
    return { page: Number.isFinite(page) && page >= 1 ? page : 1, seen };
  } catch {
    // Older `p2`-style tokens still work.
    const legacy = /^p(\d+)$/.exec(token);
    return { page: legacy ? Number(legacy[1]) : 1, seen: [] };
  }
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
  const tokenState = pageFromToken(pageToken);
  const page = tokenState.page;
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

  // ---- Fast path -----------------------------------------------------------
  // The shopper waits for exactly two things: one upstream request, and a
  // response. Firestore is *not* on that path any more:
  //   • saving runs in the background (it only enriches the catalogue);
  //   • stored products are only consulted when upstream returned nothing.
  // This is what turned a ~3-6s search into roughly the provider's own latency.
  const output = await provider
    .search({ query: text, page, limit: size, country: currencyCountry() })
    .catch((error: unknown) => {
      console.error(`Product search failed for "${text}":`, error);
      return { products: [] as Product[], hasMore: false };
    });

  let pageProducts = dedupe(output.products);
  let hasMore = output.hasMore;

  // If this refinement returned nothing usable (or only things already shown),
  // walk on to the next refinement rather than handing back an empty page —
  // that was the "Load More shows blank" case.
  const usableNow = (list: Product[]) => list.some((product) => (product.offers?.length ?? 0) > 0);
  let nextPage = page;
  let seenIds = new Set(tokenState.seen);
  while (
    hasMore &&
    nextPage - page < 3 &&
    (!usableNow(pageProducts) || pageProducts.every((product) => seenIds.has(product.id)))
  ) {
    nextPage += 1;
    const retry = await provider
      .search({ query: text, page: nextPage, limit: size, country: currencyCountry() })
      .catch(() => null);
    if (!retry) break;
    pageProducts = dedupe(retry.products);
    hasMore = retry.hasMore;
    seenIds = new Set(tokenState.seen);
  }
  const lastPage = nextPage;

  // Fire-and-forget persistence: never awaited, so a slow or unavailable store
  // cannot delay the response. `persistProducts` is idempotent by product id, so
  // a retried request just re-confirms what's already there.
  if (pageProducts.length > 0) {
    void persistProducts(pageProducts, scope).catch((error: unknown) => {
      console.error(`Could not store search results for "${text}":`, error);
    });
  }

  const usable = (product: Product) => (product.offers?.length ?? 0) > 0;
  const alreadySeen = new Set(tokenState.seen);
  const combined: Product[] = pageProducts.filter(
    (product) => usable(product) && !alreadySeen.has(product.id),
  );

  // Only when upstream has nothing new do we look in the store — this is the
  // "catalogue already collected" case, and it costs one query instead of one
  // on every search.
  if (combined.length === 0) {
    try {
      const stored = await findProductsByTerm(scope, size * 2);
      const seen = new Set<string>();
      for (const product of stored.filter(usable)) {
        if (seen.has(product.id) || alreadySeen.has(product.id)) continue;
        seen.add(product.id);
        combined.push(product);
        if (combined.length >= size) break;
      }
    } catch (error) {
      console.error(`Could not read stored results for "${text}":`, error);
    }
  }

  const page_ = combined.slice(0, size);
  rememberProducts(page_);

  return {
    products: page_,
    // Carry forward everything shown so far so the next Load More can skip it
    // without a database read.
    nextPageToken:
      pageProducts.length > 0 || hasMore
        ? encodePageToken(lastPage + 1, [...tokenState.seen, ...page_.map((product) => product.id)])
        : undefined,
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
 * Session cache of products the server has already rendered.
 *
 * The store is the durable home for products, but Firestore can be unavailable
 * (quota, outage) and the product page must still open for a card the shopper
 * just clicked. Every row and search already has the full product in memory when
 * it renders, so it's kept here for the lifetime of the process and used as a
 * last resort before giving up.
 *
 * Bounded and insertion-ordered (Map keeps insertion order): the oldest entry is
 * evicted once the cap is reached, so this cannot grow without limit.
 */
const RENDERED_LIMIT = 2000;
const renderedProducts = new Map<string, Product>();

/** Remembers products that have just been sent to the browser. */
export function rememberProducts(products: ReadonlyArray<Product>): void {
  for (const product of products) {
    if (!product?.id) continue;
    // Re-insert so a product that stays popular is evicted last.
    renderedProducts.delete(product.id);
    renderedProducts.set(product.id, product);
  }
  while (renderedProducts.size > RENDERED_LIMIT) {
    const oldest = renderedProducts.keys().next().value;
    if (oldest === undefined) break;
    renderedProducts.delete(oldest);
  }
}

/**
 * Product page data.
 *
 * Resolution order: Firestore, then this process's cache of products it has
 * already rendered. eBay listings have no variant matrix, so there is nothing to
 * re-resolve.
 */
export async function getProduct(productId: string): Promise<Product> {
  try {
    const stored = await getProductById(productId);
    if (stored) return stored;
  } catch (error) {
    console.error(`Could not read product ${productId} from the store:`, error);
  }

  const rendered = renderedProducts.get(productId);
  if (rendered) return rendered;

  throw new Error(`Product ${productId} not found`);
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
