import { convertFromUsd } from "./currency";

/**
 * MT Store site-wide offer: every product is sold by us at 80% off the listed
 * (source/Channel3) price, shown in the visitor's own currency.
 *
 * This is the ONLY place the discount is defined — every price a customer sees
 * goes through here, so product cards, cart, checkout and freebies always agree.
 *
 * `base` is always a USD amount (Channel3 prices are USD). When `currency` is
 * omitted the USD amount is returned unchanged, which is what callers that
 * only need the raw number rely on.
 */
export const STORE_DISCOUNT_PERCENT = 80;

/** The price a customer pays for us to sell it, in their currency. */
export function storePrice(base: number, currency?: string) {
  if (!Number.isFinite(base) || base <= 0) return 0;
  const discountedUsd = base * (1 - STORE_DISCOUNT_PERCENT / 100);
  if (!currency) return discountedUsd;
  return convertFromUsd(discountedUsd, currency);
}

/** What the customer saves on one unit, in their currency. */
export function storeSavings(base: number, currency?: string) {
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (!currency) return base * (STORE_DISCOUNT_PERCENT / 100);
  return convertFromUsd(base, currency) - storePrice(base, currency);
}

/** Line total for a quantity at our discounted price. */
export function storeLineTotal(base: number, quantity: number, currency?: string) {
  return storePrice(base, currency) * quantity;
}

/** The original listing price in the visitor's currency. */
export function storeListPrice(base: number, currency?: string) {
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (!currency) return base;
  return convertFromUsd(base, currency);
}
