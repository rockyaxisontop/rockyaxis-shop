# MT-Shop

Shopping app built with:

- **Next.js (App Router) + TypeScript + React 19**
- **Tailwind CSS v4** + shadcn/ui primitives
- **OneFindMe search API** (eBay listings only) for product data
- **Firestore** as the product store — every unique eBay listing is saved once
- **Firebase directly from the browser** (Auth + Firestore, no backend)

## Stack boundaries

| Layer | Where | Rule |
| --- | --- | --- |
| Provider | `lib/products/onefindme.ts` | **The only file that knows OneFindMe exists.** Public API, no key. Reads `ebay_results` only; AliExpress (`results`) is ignored. |
| Provider registry | `lib/products/provider.ts` | Declares the `ProductProvider` interface and selects one via `PRODUCT_PROVIDER`. Add a file + a registry entry to swap providers. |
| Product format | `lib/products/types.ts` | The single `Product` shape every provider must map into; the frontend imports types from here. |
| Product store | `lib/products/store.ts` | Firestore persistence: doc id = eBay item id (or URL hash), transaction-safe dedupe, category/search-term associations, query index. |
| Catalogue service | `lib/products/service.ts` | Homepage categories, customer search + Load More, details, recommendations. |
| Fetch adapters | `lib/products/client-search.ts`, `lib/products/client-products.ts` | Browser-side wrappers for `/api/catalog/*`. |
| Firebase | `lib/firebase/*` | Runs only in the browser (`"use client"`). Access is enforced by `firestore.rules`. |

## Setup

```powershell
npm install
node scripts/setup-onefindme.mjs US   # writes ONEFINDME_COUNTRY to .env.local (no key needed)
npm run dev
```

### Product source: OneFindMe → Firestore

Verified against the live API ([`openapi.json`](https://onefindme.com/openapi.json)):
`GET https://onefindme.com/api/search?query=…&country=…&max_results=…` returns AliExpress
listings in `results` and eBay listings in `ebay_results`. We collect **only eBay**, priced in
`ONEFINDME_COUNTRY`'s currency.

**Pagination limitation.** The API ignores `page`/`offset`/`cursor`/`skip` and caps
`max_results` at 20, so there is no real pagination. Load More therefore walks *query
variants* (`gaming laptop` → `gaming laptop rtx` → `gaming laptop ssd` → …), which each
surface a partly different set of eBay listings; overlaps are removed in Firestore by
item id. Each page saves newly discovered products and returns only the new ones.

**Dedupe.** The Firestore document id is the permanent eBay item id parsed from the
listing URL (or a stable hash of the canonical URL when absent), and writes go through a
transaction, so the same listing found via two categories or two searches is one document.

### The product UI components (presentational, keeps the original design)

- `components/product-search.tsx` → `ProductSearch` (used on `/search`)
- `components/product-details.tsx` → `ProductDetails` (used on `/products/[id]`)
- plus `product-card`, `product-grid`, `product-filters`, `variant-selector`, `offers-list`, `price-*`, hooks in `hooks/`, helpers in `lib/format.ts`, `lib/variants.ts`, `lib/search.ts`

To update, re-run the command with `--overwrite` (review the git diff first — these files are yours to customize).

Vendored component files are excluded from strict lint rules in `eslint.config.mjs` (upstream uses `<img>` and unescaped apostrophes).

### Firebase console checklist (no-backend setup)

1. **Authentication → Sign-in method**: enable **Google** and **Email/Password**.
2. **Authentication → Settings → Authorized domains**: add `localhost` (prod domain too).
3. **Firestore**: create the database, then paste `firestore.rules` into the rules editor and publish.
4. Optional: **Firebase Analytics** is configured via `measurementId` – use `getAnalytics()` from `firebase/analytics` in a client component if you want events.

## Data model

```
users/{uid}                        profile (displayName, email, createdAt)
carts/{uid}/items/{itemId}         live cart items (productId, options, qty, price…)
orders/{uid}/history/{orderId}     past orders (immutable)
products/{productId}               unique eBay listings (id = eBay item id) + searchTerms/categoryKeys
productQueries/{queryHash}         ordered product ids seen per search (diagnostics)
productCategories/{categoryKey}    ordered product ids per homepage category
```

## Routes

| Route | Description |
| --- | --- |
| `/` | Landing page |
| `/search` | Product search: filters, infinite scroll (Load More) |
| `/products/[id]` | Server-fetched PDP + live variant resolution + recommendations + add to cart |
| `/login` | Google / email sign-in & sign-up |
| `/cart` | Live Firestore cart |
| `POST /api/catalog/search` | Search proxy: discovers eBay listings, stores new ones, returns unique products (Load More via `page_token`) |
| `POST /api/catalog/products/[id]` | Stored product fetch / variant re-resolution (`selected_options`) |
| `GET /api/catalog/products/[id]/similar` | Similar products for the recommendations carousel |

## Verify

```powershell
npm run typecheck
npm run lint
npm run build
```
