import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "MT-Shop",
    template: "%s · MT-Shop",
  },
  description: "Find any product online, compare offers and buy from the best store.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      {/* flex-col lets `main` grow so the footer sits at the bottom on short pages */}
      <body className="flex min-h-dvh flex-col bg-surface font-sans antialiased">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-6">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
