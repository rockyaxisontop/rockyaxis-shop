import "server-only";

import { createHash } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import type { Product } from "./types";

/**
 * The store's product database (Cloud Firestore).
 *
 * One document per unique eBay listing, across every source (categories,
 * searches, recommeendations) — the document id IS the product id, which is the
 * permanent eBay item id (or a hash of the canonical URL when the id is
 * absent). Duplicate prevention is therefore a primary-key check, not a scan,
 * and it is concurrency-safe in both directions:
 *   • creations are *update-only* writes into a transaction that first asserts
 *     `create`/`update` on the document, so two simultaneous discoveries of the
 *     same listing can never both create it (whichever loses re-reads and keeps
 *     both associations);
 *   • associations and aggregates use `FieldValue.increment` / `arrayUnion`,
 *     which Firestore applies atomically server-side.
 *
 * Layout
 *   products/{productId}              the product, in the frontend's shape
 *   productQueries/{queryHash}        ordered product ids seen for a query,
 *                                     so different visitors get the same
 *                                     results and truly new listings appear
 *   productCategories/{categoryKey}   ordered product ids per homepage category
 */

const PRODUCTS = "products";
const QUERIES = "productQueries";
const CATEGORIES = "productCategories";

/** Fields kept on the document so it can be reused without re-mapping. */
const PRODUCT_FIELDS = [
  "title",
  "description",
  "brands",
  "images",
  "category",
  "gender",
  "age",
  "materials",
  "key_features",
  "colors",
  "offers",
  "variants",
  "structured_attributes",
  "ratings",
] as const;

const MAX_TERMS_PER_DOC = 40;
const MAX_CATEGORIES_PER_DOC = 12;

/** Largest id list an upstream page can produce; also the per-doc index cap. */
const MAX_IDS_PER_DOC = 100;

export type TermScope =
  | { kind: "search"; value: string }
  | { kind: "category"; value: string };

/** A persisted product, hydrated back into exactly the frontend's Product shape. */
export function toProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
  const product: Record<string, unknown> = { id };
  for (const field of PRODUCT_FIELDS) {
    if (data[field] !== undefined) product[field] = data[field];
  }
  return product as Product;
}

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hashOf(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 32);
}

export function queryKeyFor(query: string): string {
  return `q_${hashOf(normalise(query))}`;
}

export function categoryKeyFor(categoryKey: string): string {
  return `c_${hashOf(normalise(categoryKey))}`;
}

/* -------------------------------------------------------------------------- */
/* Availability gate                                                          */
/* -------------------------------------------------------------------------- */

/**
 * After Firestore answers RESOURCE_EXHAUSTED (the free tier's daily cap) or is
 * unreachable, stop hammering it for a short while.
 *
 * Without this, every homepage request paid nine failing round-trips before the
 * rows could fall back to the provider. The window is deliberately short so the
 * catalogue starts persisting again on its own once the quota resets.
 */
const UNAVAILABLE_RETRY_MS = 5 * 60 * 1000;
let unavailableUntil = 0;

function isQuotaOrAvailabilityError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    code === 8 || // gRPC RESOURCE_EXHAUSTED
    code === 14 || // UNAVAILABLE
    /RESOURCE_EXHAUSTED|quota|unavailable|ECONNREFUSED/i.test(message)
  );
}

/** Runs a Firestore operation; remembers quota/outage failures for a while. */
async function guarded<T>(operation: () => Promise<T>): Promise<T> {
  if (Date.now() < unavailableUntil) {
    throw new Error("Firestore is temporarily unavailable; using the live provider.");
  }
  try {
    return await operation();
  } catch (error) {
    if (isQuotaOrAvailabilityError(error)) {
      unavailableUntil = Date.now() + UNAVAILABLE_RETRY_MS;
    }
    throw error;
  }
}

/** True while Firestore is being skipped (used to keep the UI honest). */
export function isStoreUnavailable(): boolean {
  return Date.now() < unavailableUntil;
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export async function getProductById(id: string): Promise<Product | null> {
  return guarded(async () => {
    const snapshot = await getAdminDb().collection(PRODUCTS).doc(id).get();
    return snapshot.exists ? toProduct(snapshot.id, snapshot.data() ?? {}) : null;
  });
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  return guarded(async () => {
    const db = getAdminDb();
    const snapshots = await Promise.all(unique.map((id) => db.collection(PRODUCTS).doc(id).get()));
    return snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => toProduct(snapshot.id, snapshot.data() ?? {}));
  });
}

export type ListedProducts = { ids: string[]; total: number };

/**
 * Ids already RETURNED to the client for page `page` of a search…
 *
 * Load More needs a record of what the shopper has already seen: a listing can
 * be *stored* (from another search or a homepage row) without ever having been
 * shown for this query. Recording the page snapshot is what keeps every page
 * strictly new while still reusing the Firestore catalogue.
 */
export async function readSearchPage(scope: TermScope, page: number): Promise<string[]> {
  if (scope.kind !== "search") return [];
  const key = queryKeyFor(scope.value);
  const snapshot = await getAdminDb().collection(QUERIES).doc(key).get();
  const pages = (snapshot.data()?.pages ?? {}) as Record<string, string[]>;
  return Array.isArray(pages[String(page)]) ? pages[String(page)] : [];
}

/** Ordered, paginated product ids recorded for a query or a category. */
export async function listProductIds(
  scope: TermScope,
  { offset, limit }: { offset: number; limit: number },
): Promise<ListedProducts> {
  const db = getAdminDb();
  const key = scope.kind === "search" ? queryKeyFor(scope.value) : categoryKeyFor(scope.value);
  const collection = scope.kind === "search" ? QUERIES : CATEGORIES;
  const snapshot = await db.collection(collection).doc(key).get();

  if (!snapshot.exists) {
    // Derived Firestore products (recommeended via another surface) are a
    // fallback so the row/list is never empty while the catalogue warms up.
    return { ids: [], total: 0 };
  }

  const data = snapshot.data() ?? {};
  const ids = Array.isArray(data.productIds) ? (data.productIds as string[]) : [];
  return { ids: ids.slice(offset, offset + limit), total: ids.length };
}

/** Products persisted before this query/category index existed specifically for it. */
export async function findProductsByTerm(scope: TermScope, limit: number): Promise<Product[]> {
  const normalised = normalise(scope.value);
  if (!normalised) return [];
  try {
    const snapshot = await getAdminDb()
      .collection(PRODUCTS)
      .where("searchTerms", "array-contains", normalised)
      .limit(limit)
      .get();
    return snapshot.docs
      .filter((doc) => (doc.data().offers as Product["offers"] | undefined)?.length)
      .map((doc) => toProduct(doc.id, doc.data()));
  } catch {
    return [];
  }
}

export async function findProductsByCategory(categoryKey: string, limit: number): Promise<Product[]> {
  const normalised = normalise(categoryKey);
  if (!normalised) return [];
  try {
    const snapshot = await getAdminDb()
      .collection(PRODUCTS)
      .where("categoryKeys", "array-contains", normalised)
      .limit(limit)
      .get();
    return snapshot.docs
      .filter((doc) => (doc.data().offers as Product["offers"] | undefined)?.length)
      .map((doc) => toProduct(doc.id, doc.data()));
  } catch {
    return [];
  }
}

/** Stable, in-memory fallback used by the similarity carousel. */
export async function recentProducts(limit: number): Promise<Product[]> {
  try {
    const snapshot = await getAdminDb()
      .collection(PRODUCTS)
      .orderBy("discoveredAt", "desc")
      .limit(limit)
      .get();
    return snapshot.docs
      .filter((doc) => (doc.data().offers as Product["offers"] | undefined)?.length)
      .map((doc) => toProduct(doc.id, doc.data()));
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

function productPayload(product: Product, scope: TermScope): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of PRODUCT_FIELDS) {
    const value = product[field];
    if (value !== undefined && value !== null) payload[field] = value;
  }

  const term = normalise(scope.value);
  const association = scope.kind === "search" ? "searchTerms" : "categoryKeys";
  payload[association] = term ? [term] : [];

  if (product.ratings?.value) {
    payload.ratingValue = product.ratings.value;
  }
  return payload;
}

/**
 * Saves one discovered product if (and only if) it is new, and records the
 * association either way. Returns true when the document was created.
 *
 * Runs inside a transaction that touches the product document first, so two
 * concurrent discoveries of the same listing serialize on it; the loser sees
 * `exists === true` and only merges its extra association.
 */
export async function saveDiscoveredProduct(product: Product, scope: TermScope): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection(PRODUCTS).doc(product.id);
  const term = normalise(scope.value);
  const association = scope.kind === "search" ? "searchTerms" : "categoryKeys";

  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);

    if (!snapshot.exists) {
      tx.set(ref, {
        ...productPayload(product, scope),
        discoveredAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        timesSeen: 1,
      });
      return true;
    }

    const data = snapshot.data() ?? {};
    if (term) {
      const existing = Array.isArray(data[association]) ? (data[association] as string[]) : [];
      if (!existing.includes(term)) {
        tx.update(ref, {
          [association]: FieldValue.arrayUnion(term),
          updatedAt: Timestamp.now(),
          timesSeen: FieldValue.increment(1),
        });
        return false;
      }
    }
    tx.update(ref, { updatedAt: Timestamp.now(), timesSeen: FieldValue.increment(1) });
    return false;
  });
}

/**
 * Records newly discovered ids for a query/category index, appending only ids
 * that index doesn't already hold (so Load More returns genuinely new items).
 */
export type IndexRecord = {
  ids: string[];
  /** For searches: the exact ids RETURNED as this page's snapshot. */
  page?: number;
};

/**
 * Records discovered ids for a query/category index.
 *
 * Search indexes also store a per-page snapshot (`pages.<n>`), which is the
 * record of what the shopper has been shown. `page` is only written when it is
 * not already present, so a retried request replays the same page instead of
 * re-slicing it.
 */
export async function appendToIndex(scope: TermScope, record: IndexRecord): Promise<void> {
  const { ids, page } = record;
  if (ids.length === 0) return;
  // Same cooling-off rule as `persistProducts`: an index is bookkeeping, and
  // retrying it against an exhausted quota only costs more doomed calls.
  if (isStoreUnavailable()) return;
  const db = getAdminDb();
  const key = scope.kind === "search" ? queryKeyFor(scope.value) : categoryKeyFor(scope.value);
  const collection = scope.kind === "search" ? QUERIES : CATEGORIES;
  const ref = db.collection(collection).doc(key);

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const data = snapshot.data() ?? {};
    const patch: Record<string, unknown> = {
      kind: scope.kind,
      value: normalise(scope.value),
      updatedAt: Timestamp.now(),
    };

    if (page != null && scope.kind === "search") {
      const pages = (data.pages ?? {}) as Record<string, string[]>;
      if (!Array.isArray(pages[String(page)])) {
        patch[`pages.${page}`] = ids;
      }
    }

    // Aggregate log of everything seen for this scope (diagnostics + the
    // category-row fallback). Newest first; capped well under 1MB.
    const existing = Array.isArray(data.productIds) ? (data.productIds as string[]) : [];
    const stored = new Set(existing);
    const fresh = ids.filter((id) => !stored.has(id));
    if (fresh.length > 0) {
      patch.productIds = [...fresh, ...existing].slice(0, MAX_IDS_PER_DOC);
    }

    if (Object.keys(patch).length <= 3 && !("productIds" in patch) && !(`pages.${page}` in patch)) {
      tx.set(ref, { lastCheckedAt: Timestamp.now() }, { merge: true });
      return;
    }
    tx.set(ref, patch, { merge: true });
  });
}

/**
 * Persists a batch of products plus their index/association metadata. Bounded
 * writes: only new documents are created; existing ones just gain associations.
 */
export async function persistProducts(
  products: Product[],
  scope: TermScope,
  { indexScopes = [] }: { indexScopes?: TermScope[] } = {},
): Promise<Product[]> {
  const unique = dedupe(products);
  if (unique.length === 0) return [];

  // Skip writes entirely while the store is cooling down after a quota/outage
  // failure. Without this, every homepage row retried a failing write and a
  // single page load cost dozens of doomed round-trips.
  if (isStoreUnavailable()) return unique;

  const db = getAdminDb();
  const refs = unique.map((product) => db.collection(PRODUCTS).doc(product.id));

  let found: Map<string, FirebaseFirestore.DocumentSnapshot>;
  try {
    found = new Map((await db.getAll(...refs)).map((snapshot) => [snapshot.id, snapshot]));
  } catch (error) {
    if (isQuotaOrAvailabilityError(error)) unavailableUntil = Date.now() + UNAVAILABLE_RETRY_MS;
    throw error;
  }

  const batch = db.batch();
  const term = normalise(scope.value);
  const association = scope.kind === "search" ? "searchTerms" : "categoryKeys";
  const now = Timestamp.now();
  let writes = 0;

  for (const product of unique) {
    const ref = db.collection(PRODUCTS).doc(product.id);
    const snapshot = found.get(product.id);

    if (!snapshot?.exists) {
      batch.set(ref, {
        ...productPayload(product, scope),
        discoveredAt: now,
        updatedAt: now,
        timesSeen: 1,
      });
      writes += 1;
      continue;
    }

    const data = snapshot.data() ?? {};
    const patch: Record<string, unknown> = { updatedAt: now, timesSeen: FieldValue.increment(1) };
    const terms = Array.isArray(data[association]) ? (data[association] as string[]) : [];
    if (term && !terms.includes(term) && terms.length < (scope.kind === "search" ? MAX_TERMS_PER_DOC : MAX_CATEGORIES_PER_DOC)) {
      patch[association] = FieldValue.arrayUnion(term);
    }
    batch.update(ref, patch);
    writes += 1;
  }

  if (writes > 0) {
    // Firestore caps a batch at 500 writes; batches here are ≤ 40 products.
    try {
      await batch.commit();
    } catch (error) {
      if (isQuotaOrAvailabilityError(error)) unavailableUntil = Date.now() + UNAVAILABLE_RETRY_MS;
      throw error;
    }
  }

  for (const indexScope of [scope, ...indexScopes]) {
    await appendToIndex(indexScope, { ids: unique.map((product) => product.id) });
  }

  return unique;
}

export function dedupe(products: Product[]): Product[] {
  const seen = new Set<string>();
  const unique: Product[] = [];
  for (const product of products) {
    if (!product.id || seen.has(product.id)) continue;
    seen.add(product.id);
    unique.push(product);
  }
  return unique;
}

/** Appends a search page's snapshot so Load More never repeats it. */
export async function recordSearchPage(scope: TermScope, page: number, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await appendToIndex(scope, { ids, page });
}

/** Existing ids among a candidate list — one read per product, all parallel. */
export async function existingIds(ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Set();
  const db = getAdminDb();
  const snapshots = await db.getAll(...unique.map((id) => db.collection(PRODUCTS).doc(id)));
  return new Set(snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id));
}
