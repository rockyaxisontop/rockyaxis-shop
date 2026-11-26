import type {
  OfferAvailabilityStatus,
  Price,
  ProductImage,
  ProductOffer,
} from "@/lib/products/types";

import { formatLocal } from "./currency";
import { STORE_DISCOUNT_PERCENT, storeListPrice, storePrice } from "./discount";

/**
 * Format a numeric amount as a localized currency string. Falls back to a
 * plain `CODE 12.34` string when the runtime doesn't recognize the currency.
 */
/**
 * Format an amount that is ALREADY in `currency`. Never shows decimals — the
 * store quotes whole unit prices everywhere.
 */
export function formatCurrency(amount: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

/**
 * Format one of our prices. Amounts are whole numbers in the visitor's
 * currency, so this never renders decimals.
 */
export function formatMoney(amount: number, currency: string, locale?: string): string {
  return formatLocal(amount, currency, locale);
}

/**
 * The price the shopper pays: 80% off the USD list price, converted to their
 * currency and rounded to a whole amount.
 */
export function formatPrice(price: Price, locale?: string, currency?: string): string {
  const code = currency ?? price.currency ?? "USD";
  return formatLocal(storePrice(price.price, code), code, locale);
}

/**
 * The struck-through "was" price: the source listing, converted to the
 * visitor's currency. This is what our discount is measured against.
 */
export function formatListPrice(price: Price, locale?: string, currency?: string): string {
  const code = currency ?? price.currency ?? "USD";
  return formatLocal(storeListPrice(price.price, code), code, locale);
}

export function isOnSale(price: Price): boolean {
  return typeof price.compare_at_price === "number" && price.compare_at_price > price.price;
}

/**
 * Every product carries the same store-wide discount, so this is a constant.
 * It still takes the price so call sites read naturally and can be narrowed
 * later if particular products are ever excluded.
 */
export function discountPercent(price: Price): number {
  return price.price > 0 ? STORE_DISCOUNT_PERCENT : 0;
}

export function formatDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

export function isInStock(status: OfferAvailabilityStatus): boolean {
  return status === "InStock";
}

const AVAILABILITY_LABELS: Record<OfferAvailabilityStatus, string> = {
  InStock: "In stock",
  OutOfStock: "Out of stock",
};

export function availabilityLabel(status: OfferAvailabilityStatus): string {
  return AVAILABILITY_LABELS[status];
}

/**
 * Display URL for an image. `preferCleaned` picks `cleaned_url` (the
 * background-removed square) when the API has one, and falls back to `url`.
 */
export function productImageUrl(
  image: ProductImage,
  { preferCleaned = false }: { preferCleaned?: boolean } = {},
): string {
  if (preferCleaned) {
    const cleaned = image.cleaned_url;
    if (cleaned) {
      return cleaned;
    }
  }
  return image.url;
}

export function pickImage(
  images: ReadonlyArray<ProductImage> | undefined,
): ProductImage | undefined {
  if (!images || images.length === 0) {
    return undefined;
  }
  return images.find((image) => image.is_main_image) ?? images[0];
}

/**
 * Hover/secondary image priority: a contextual shot (product worn or in use)
 * makes a far more compelling crossfade than another clean studio angle. Shot
 * types are tried in this order, then any remaining image, with reference shots
 * (size charts, packaging, etc.) excluded entirely.
 */
const HOVER_SHOT_PRIORITY: ReadonlyArray<NonNullable<ProductImage["shot_type"]>> = [
  "on_model",
  "lifestyle",
  "in_use",
  "flat_lay",
  "angle_view",
];

const HOVER_SHOT_EXCLUDE: ReadonlySet<NonNullable<ProductImage["shot_type"]>> = new Set([
  "size_chart",
  "packaging",
  "product_information",
  "merchant_information",
  "scale_reference",
]);

/**
 * Pick the best image to crossfade to on hover, preferring contextual shots
 * (see {@link HOVER_SHOT_PRIORITY}). Returns `undefined` when there's no
 * suitable second image.
 */
export function pickHoverImage(
  images: ReadonlyArray<ProductImage> | undefined,
  { excludeUrl }: { excludeUrl?: string } = {},
): ProductImage | undefined {
  if (!images || images.length === 0) {
    return undefined;
  }
  const candidates = images.filter(
    (image) =>
      image.url !== excludeUrl &&
      !(image.shot_type != null && HOVER_SHOT_EXCLUDE.has(image.shot_type)),
  );
  if (candidates.length === 0) {
    return undefined;
  }
  for (const shot of HOVER_SHOT_PRIORITY) {
    const match = candidates.find((image) => image.shot_type === shot);
    if (match) {
      return match;
    }
  }
  return candidates[0];
}

export function leadOffer(offers: ReadonlyArray<ProductOffer> | undefined): ProductOffer | undefined {
  if (!offers || offers.length === 0) {
    return undefined;
  }
  const byPrice = [...offers].sort((a, b) => a.price.price - b.price.price);
  return byPrice.find((offer) => isInStock(offer.availability)) ?? byPrice[0];
}

export function isSoldOut(offers: ReadonlyArray<ProductOffer> | undefined): boolean {
  return Boolean(offers && offers.length > 0 && !offers.some((o) => isInStock(o.availability)));
}
