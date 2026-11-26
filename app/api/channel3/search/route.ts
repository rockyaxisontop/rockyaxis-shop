/**
 * Backwards-compatible alias.
 *
 * The storefront now calls `/api/catalog/search`; this path is kept so an older
 * cached client bundle or bookmark still works. Both hit the same handler.
 */
export { POST } from "@/app/api/catalog/search/route";
