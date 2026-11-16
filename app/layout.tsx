import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { CurrencyProvider } from "@/components/currency-provider";
import { Providers } from "@/components/providers";
import { getCurrencyContext } from "@/lib/currency/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FloatingOrderContact } from "@/components/floating-order-contact";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "MT-Shop",
    template: "%s · MT-Shop",
  },
  description: "Find any product online, compare offers and buy from the best store.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Prices are shown in the visitor's own currency, from their request country.
  const { currency } = await getCurrencyContext();

  return (
    <html lang="en" className={inter.variable}>
      {/* flex-col lets `main` grow so the footer sits at the bottom on short pages */}
      <body className="flex min-h-dvh flex-col bg-surface font-sans antialiased">
        <Providers>
          <CurrencyProvider currency={currency}>
            <SiteHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-6">{children}</main>
            <SiteFooter />
            <FloatingOrderContact />
          </CurrencyProvider>
        </Providers>
      </body>
    </html>
  );
}
