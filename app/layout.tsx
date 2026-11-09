import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MT-Shop",
    template: "%s · MT-Shop",
  },
  description: "Find any product online, compare offers and buy from the best store.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* flex-col lets `main` grow so the footer sits at the bottom on short pages */}
      <body className="flex min-h-dvh flex-col antialiased">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-6">{children}</main>
          <footer className="border-t">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-6 text-sm text-muted-foreground">
              <p>© {new Date().getFullYear()} MT-Shop</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
