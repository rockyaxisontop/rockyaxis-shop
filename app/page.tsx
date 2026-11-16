import Link from "next/link";
import { ArrowRight, BadgeCheck, Headphones, ShieldCheck, Truck } from "lucide-react";

import { CategoryTiles } from "@/components/category-tiles";
import { PromoBanners } from "@/components/promo-banners";
import { ProductGrid } from "@/components/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { getSuggestedProducts, type SuggestedGroup } from "@/lib/channel3/products";

// Product rows are refreshed at most every 30 minutes.
export const revalidate = 1800;

const trusted = [
  { icon: Truck, label: "Free delivery", text: "on every order" },
  { icon: ShieldCheck, label: "Genuine products", text: "warranty included" },
  { icon: BadgeCheck, label: "Best price", text: "compared across stores" },
  { icon: Headphones, label: "Support", text: "every day, 9am – 8pm" },
];

export default async function HomePage() {
  const groups = await getSuggestedProducts(4);
  const [first, ...rest] = groups;

  return (
    <div className="flex flex-col gap-8 py-4 sm:gap-10 sm:py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4] px-5 py-8 text-white sm:px-10 sm:py-12">
        <div className="relative z-10 max-w-2xl">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
            Thousands of stores, one checkout
          </span>
          <h1 className="text-3xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl">
            Everything you need, at the best price.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-white/80 sm:text-base">
            Compare live prices on tech, home, fashion and everyday essentials from stores you trust.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/75">
            <span>Popular:</span>
            {[
              ["Smartphones", "smartphones"],
              ["Home", "home kitchen"],
              ["Laptops", "laptops"],
            ].map(([label, query]) => (
              <Link key={query} href={`/search?q=${encodeURIComponent(query)}`} className="underline decoration-white/40 underline-offset-4 hover:text-white">
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/search"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-[#011627] transition hover:bg-white/90"
            >
              Shop now
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/search?q=smartphones"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Browse smartphones
            </Link>
          </div>
        </div>
        <span className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/10 sm:size-80" />
        <span className="pointer-events-none absolute -right-4 -bottom-24 size-48 rounded-full bg-[#2da9d6]/30 sm:size-72" />
      </section>

      <CategoryTiles />

      <PromoBanners />

      {groups.length === 0 ? (
        <p role="status" className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-ink-soft">
          Product picks are temporarily unavailable. Browse a category to search the live catalog.
        </p>
      ) : null}

      {/* First product row */}
      {first && first.products.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeading
            title={first.title}
            subtitle="Hand-picked everyday essentials"
            href={`/search?q=${encodeURIComponent(first.query)}`}
          />
          <ProductGrid products={first.products} />
        </section>
      ) : null}

      {/* Trust strip */}
      <section className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-4 sm:p-5">
        {trusted.map(({ icon: Icon, label, text }) => (
          <div key={label} className="flex items-start gap-2.5">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand" />
            <div>
              <p className="text-[13px] font-semibold text-ink">{label}</p>
              <p className="text-[11px] text-ink-soft">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Remaining product rows */}
      {rest.map((group: SuggestedGroup) => (
        <section key={group.key} className="flex flex-col gap-4">
          <SectionHeading
            title={group.title}
            href={`/search?q=${encodeURIComponent(group.title)}`}
          />
          <ProductGrid products={group.products} />
        </section>
      ))}
    </div>
  );
}
