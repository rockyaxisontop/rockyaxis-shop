# MT-Shop

Shopping app built with:

- **Next.js (App Router) + TypeScript + React 19**
- **Tailwind CSS v4** + shadcn/ui primitives
- **Channel3 API** for product search/details + the **official Channel3 React components**
- **Firebase Auth + Firestore** for browser sign-in, cart, and profile data
- **Firebase Admin on the server** for verified referral campaigns and free-order writes

## Stack boundaries

| Layer | Where | Rule |
| --- | --- | --- |
| Channel3 | `lib/channel3/server.ts`, `lib/channel3/products.ts` | `CHANNEL3_API_KEY` is a **server secret**. Never import these into a client component. |
| Channel3 UI | `components/product-*.tsx`, `components/search-bar.tsx` (installed via shadcn) | Presentational only – they receive data as props and call fetchers you pass in. |
| Fetch adapters | `lib/channel3/client-search.ts`, `lib/channel3/client-products.ts` | Turn the blocks' camelCase fetchers into calls to the `/api/channel3/*` proxies. |
| Firebase client | `lib/firebase/*` | Auth + cart/profile reads run in the browser and are enforced by `firestore.rules`. |
| Firebase Admin | `lib/firebase/admin.ts`, `app/api/freebies/*` | Service-account secret stays server-only. It verifies referrals and creates immutable free-order records. |

## Setup

```powershell
npm install
node scripts/setup-channel3.mjs <your_channel3_api_key>   # writes .env.local
npm run dev
```

Freebie campaigns additionally require a Firebase service-account JSON in the server-only
`FIREBASE_ADMIN_SERVICE_ACCOUNT` environment variable. Store the JSON as one line with newlines in
`private_key` escaped as `\\n`; never commit the service-account key. Campaigns last seven days,
require 15 distinct newly created accounts with verified email, and recheck stock before a free
order is recorded. Pay Now continues to each product's retailer because this app has no payment
processor. Free orders are recorded as pending fulfillment for the store team to review.

### The official Channel3 components (already installed)

The full kit was installed with:

```powershell
npx shadcn@latest add https://ui.trychannel3.com/r/all.json
```

That generated flattened source (the CLI rewrites registry paths), so:

- `components/product-search.tsx` → `ProductSearch` (used on `/search`)
- `components/product-details.tsx` → `ProductDetails` (used on `/products/[id]`)
- plus `product-card`, `product-grid`, `product-filters`, `variant-selector`, `offers-list`, `price-*`, hooks in `hooks/`, helpers in `lib/format.ts`, `lib/variants.ts`, `lib/search.ts`

To update, re-run the command with `--overwrite` (review the git diff first — these files are yours to customize).

Vendored component files are excluded from strict lint rules in `eslint.config.mjs` (upstream uses `<img>` and unescaped apostrophes).

### Firebase console checklist

1. **Authentication → Sign-in method**: enable **Google** and **Email/Password**.
2. **Authentication → Settings → Authorized domains**: add `localhost` (prod domain too).
3. **Firestore**: create the database, then paste `firestore.rules` into the rules editor and publish.
4. Optional: **Firebase Analytics** is configured via `measurementId` – use `getAnalytics()` from `firebase/analytics` in a client component if you want events.

## Data model

```
users/{uid}                        profile (displayName, email, createdAt)
carts/{uid}/items/{itemId}         live cart items (productId, options, qty, price…)
orders/{uid}/history/{orderId}     past orders (immutable)
freebieCampaigns/{campaignId}      server-managed 15-referral campaigns
freebieCampaignIndexes/{key}       server-managed owner/product campaign index
freebieReferralClaims/{uid}         one referral claim per verified account
```

## Routes

| Route | Description |
| --- | --- |
| `/` | Landing page |
| `/search` | Channel3 product search: filters, image search, infinite scroll |
| `/products/[id]` | Server-fetched PDP + live variant resolution + recommendations + add to cart |
| `/login` | Google / email sign-in & sign-up |
| `/cart` | Live Firestore cart |
| `/checkout?mode=pay` | Cart review with Pay Now links to each retailer |
| `/checkout?mode=free` | Choose a cart product for a freebie referral campaign |
| `/freebie/[campaignId]` | Share a campaign link, track referrals, and claim a free order |
| `/order-confirmation/[orderId]` | Confirmation for a pending-fulfillment free order |
| `POST /api/channel3/search` | Key-hiding proxy for searches (text, image, pagination) |
| `POST /api/channel3/products/[id]` | Product fetch + variant re-resolution (`selected_options`) |
| `GET /api/channel3/products/[id]/similar` | Similar products for the recommendations carousel |
| `/api/freebies/campaigns/*` | Trusted campaign creation, verified referral claims, and free-order writes |
| `GET /api/orders/[orderId]` | Authenticated order confirmation lookup |

## Verify

```powershell
npm run typecheck
npm run lint
npm run build
```
