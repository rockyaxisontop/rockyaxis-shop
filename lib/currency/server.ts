import "server-only";

import { headers } from "next/headers";

import { currencyContext, type CurrencyContext } from "./index";

/** Header Vercel sets on every request to an ISO-3166 alpha-2 country code. */
const COUNTRY_HEADER = "x-vercel-ip-country";

/** Vercel sets this to "1" when a visitor opts out of geolocation. */
const OPT_OUT_HEADER = "x-vercel-ip-country-region";

/**
 * The visitor's currency, worked out from where they are.
 *
 * Falls back to USD when the request has no geo data (local `next dev`, a
 * self-hosted deploy, or a visitor who opted out of location sharing).
 */
export async function getCurrencyContext(): Promise<CurrencyContext> {
  const h = await headers();
  const country = h.get(COUNTRY_HEADER) ?? h.get("cf-ipcountry") ?? process.env.DEFAULT_COUNTRY ?? null;
  // Note: a missing/empty header is expected in dev — never treat it as an error.
  void h.get(OPT_OUT_HEADER);
  return currencyContext(country);
}
