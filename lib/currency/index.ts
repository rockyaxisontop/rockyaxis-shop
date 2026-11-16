/**
 * Local-currency pricing.
 *
 * Every price on the site is USD internally. On the server we read the
 * visitor's country from the `x-vercel-ip-country` header, pick that country's
 * currency, convert, round to a whole-number "pretty" price and format it.
 *
 * Rules asked for by the business:
 *  - no decimals anywhere;
 *  - the final digits should be a tidy round figure rather than a random one.
 */

import { currencyForCountry } from "./countries";
import { USD_RATES } from "./rates";

export { currencyForCountry, localeForCountry } from "./countries";

export type CurrencyContext = {
  country: string;
  currency: string;
  /** Locale used only to group digits / place the symbol. */
  locale: string;
};

/** Countries where prices are conventionally spoken in whole units. */
const ZERO_DECIMAL = new Set([
  "JPY", "KRW", "VND", "IDR", "CLP", "PYG", "ISK", "HUF", "COP", "UZS", "LBP", "IRR",
  "KHR", "LAK", "MMK", "MGA", "RWF", "UGX", "XOF", "XAF", "XPF", "GNF", "KMF", "DJF",
]);

/** Locale used for digit grouping; the currency decides the symbol. */
const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  NPR: "en-IN",
  PKR: "en-PK",
  BDT: "en-IN",
  LKR: "en-IN",
  JPY: "ja-JP",
  CNY: "zh-CN",
  KRW: "ko-KR",
  EUR: "de-DE",
  GBP: "en-GB",
  BRL: "pt-BR",
  RUB: "ru-RU",
  TRY: "tr-TR",
  IDR: "id-ID",
  VND: "vi-VN",
  THB: "th-TH",
  PHP: "en-PH",
  MXN: "es-MX",
  ZAR: "en-ZA",
  NGN: "en-NG",
  AED: "en-AE",
  SAR: "en-SA",
};

export function USD_TO_CURRENCY(currency: string): number {
  const code = currency.toUpperCase();
  return USD_RATES[code] ?? 1;
}

/**
 * Round to a "pretty" whole amount. Smaller numbers land on the nearest 10
 * (so always ending in 0); larger amounts on the nearest 100. Keeps prices
 * looking deliberate instead of like a raw FX conversion.
 */
export function prettyRound(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount < 100) return Math.max(1, Math.round(amount / 10) * 10);
  if (amount < 1000) return Math.round(amount / 10) * 10;
  if (amount < 100_000) return Math.round(amount / 100) * 100;
  return Math.round(amount / 1000) * 1000;
}

/** USD → local amount, already rounded to a whole pretty number. */
export function convertFromUsd(usdAmount: number, currency: string): number {
  if (!Number.isFinite(usdAmount) || usdAmount <= 0) return 0;
  return prettyRound(usdAmount * USD_TO_CURRENCY(currency));
}

/**
 * Freebie/campaign prices are ALREADY in our selling currency (they were
 * converted once and stored). Re-converting them would double-apply FX, so we
 * only round them for display.
 */
export function localAmount(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(amount) : prettyRound(amount);
}

/** Format with zero decimals, keeping the currency symbol intact. */
export function formatLocal(amount: number, currency: string, locale?: string): string {
  const code = currency.toUpperCase();
  const resolvedLocale = locale ?? CURRENCY_LOCALE[code] ?? "en-US";
  const value = Math.round(amount);
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString("en-US")}`;
  }
}

/**
 * Currency context from a country code, or straight from an explicit currency
 * when the caller already knows it (e.g. the server resolved it earlier).
 */
export function currencyContext(countryCode?: string | null, currency?: string): CurrencyContext {
  const resolved = currency?.toUpperCase() ?? currencyForCountry(countryCode);
  return {
    country: (countryCode ?? "US").toUpperCase(),
    currency: resolved,
    locale: CURRENCY_LOCALE[resolved] ?? "en-US",
  };
}
