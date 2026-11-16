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
  children,
}: {
  /** ISO code resolved on the server, e.g. "NPR". */
  currency?: string;
  children: ReactNode;
}) {
  return (
    <CurrencyCtx.Provider value={currencyContext(undefined, currency)}>{children}</CurrencyCtx.Provider>
  );
}

export function useCurrency(): CurrencyContext {
  return useContext(CurrencyCtx);
}
