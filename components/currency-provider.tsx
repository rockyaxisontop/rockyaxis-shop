"use client";

import { createContext, useContext, type ReactNode } from "react";

import { currencyContext, type CurrencyContext } from "@/lib/currency";

const CurrencyCtx = createContext<CurrencyContext>(currencyContext("US"));

/**
 * Carries the currency worked out on the server (from the visitor's country)
 * down to every price-rendering client component, so grids, cards and the cart
 * all show the same currency without prop-drilling through each wrapper.
 */
export function CurrencyProvider({
  currency,
  country,
  children,
}: {
  /** ISO code resolved on the server, e.g. "NPR". */
  currency?: string;
  /** ISO-3166 country resolved on the server, e.g. "NP". */
  country?: string;
  children: ReactNode;
}) {
  return (
    <CurrencyCtx.Provider value={currencyContext(country, currency)}>{children}</CurrencyCtx.Provider>
  );
}

export function useCurrency(): CurrencyContext {
  return useContext(CurrencyCtx);
}

/**
 * The visitor's shipping destination, as the storefront promises it.
 *
 * Delivery is quoted at a fixed window and ships from the visitor's own country,
 * mirroring the country-based currency the site already uses.
 */
export const DELIVERY_WINDOW = "24-48h";

export function useShippingInfo(): { window: string; shipsFrom: string } {
  const { countryName } = useCurrency();
  return { window: DELIVERY_WINDOW, shipsFrom: countryName };
}
