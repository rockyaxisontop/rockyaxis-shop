import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { CurrencyProvider } from "@/components/currency-provider";
import { Providers } from "@/components/providers";
import { getCurrencyContext } from "@/lib/currency/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FloatingOrderContact } from "@/components/floating-order-contact";
import { SiteStructuredData } from "@/components/structured-data";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_NAME, SITE_URL } from "@/lib/site";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MT-Shop",
    template: "%s · MT-Shop",
  },
  description: "Find any product online, compare offers and buy from the best store.",
  applicationName: SITE_NAME,
  keywords: [
    "online shopping Nepal",
    "buy electronics online",
    "compare prices",
    "mobile phones",
    "laptops",
    "headphones",
    "smartwatches",
    "MT Store",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, address: false, email: false },
  category: "shopping",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico", "/favicon-32x32.png"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  // Next emits the `appleWebApp` extras but not this legacy flag, which older
  // iOS still needs for a full-screen home-screen launch.
  other: { "apple-mobile-web-app-capable": "yes" },
};

/**
 * Viewport / browser-UI settings. Next 15 requires these in their own export
 * rather than in `metadata`.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1d7fa4" },
    { media: "(prefers-color-scheme: dark)", color: "#011627" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Prices, shop location and delivery copy all follow the visitor's country.
  const { currency, country, countryName: visitorCountry, capital } = await getCurrencyContext();

  return (
    <html lang="en" className={inter.variable}>

      {/* flex-col lets `main` grow so the footer sits at the bottom on short pages */}
      <body className="flex min-h-dvh flex-col bg-surface font-sans antialiased">
        <SiteStructuredData countryName={visitorCountry} capital={capital} countryCode={country} />
        {/* Keyboard/screen-reader users can jump straight past the navigation. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-brand focus:shadow-lg"
        >
          Skip to main content
        </a>
        <Providers>
          <CurrencyProvider currency={currency} country={country}>
            <SiteHeader />
            <main
              id="main-content"
              tabIndex={-1}
              className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-6"
            >
              {children}
            </main>
            <SiteFooter />
            <FloatingOrderContact />
            <InstallPrompt />
            <ServiceWorkerRegistrar />
          </CurrencyProvider>
        </Providers>
      </body>
    </html>
  );
}
