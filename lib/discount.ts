/**
 * MT Store site-wide offer: every product is sold by us at 80% off the listed
 * (source/Channel3) price. This is the ONLY place the discount is defined —
 * every price shown to a customer goes through here so the number a shopper
 * sees on a product card, in the cart and at checkout is always the same.
 *
 * The Channel3 price is kept purely as the struck-through "was" price.
 */
export const STORE_DISCOUNT_PERCENT = 80;

/** Currency-aware rounding so prices never show ugly fractions of a paisa/cent. */
function roundMoney(amount: number, currency: string) {
  // Currencies without minor units (JPY, KRW, …) round to whole numbers.
  const zeroDecimal = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "HUF"]);
  if (zeroDecimal.has(currency.toUpperCase())) return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

/** The price a customer actually pays for us to sell it. */
export function storePrice(amount: number, currency = "USD") {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return roundMoney(amount * (1 - STORE_DISCOUNT_PERCENT / 100), currency);
}

/** What the customer saves on one unit. */
export function storeSavings(amount: number, currency = "USD") {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return roundMoney(amount - storePrice(amount, currency), currency);
}

/** Line total for a quantity at our discounted price. */
export function storeLineTotal(amount: number, quantity: number, currency = "USD") {
  return roundMoney(storePrice(amount, currency) * quantity, currency);
}
