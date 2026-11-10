import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Search, ShoppingBag, Sparkles } from "lucide-react";

import { ProductSuggestions } from "@/components/product-suggestions";

export const metadata: Metadata = {
  title: "About MT Store",
  description: "Learn how MT Store helps you discover products and compare offers from online stores.",
};

const steps = [
  {
    icon: Search,
    title: "Discover",
    description: "Explore curated product ideas or search across categories to find what you need.",
  },
  {
    icon: BadgeCheck,
    title: "Compare",
    description: "Review available product offers and pricing details before choosing a store.",
  },
  {
    icon: ShoppingBag,
    title: "Choose how to shop",
    description: "Continue to a retailer to buy, or explore a separate freebie campaign when available.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 py-4 sm:gap-14 sm:py-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#011627] via-[#0b3d59] to-[#1d7fa4] px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="size-3.5" />
            A clearer way to find your next favorite thing
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Good shopping starts with a good choice.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
            MT Store brings product discovery and offer comparison together, so you can explore,
            compare the details, and decide where to shop with more confidence.
          </p>
          <Link
            href="/search"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#011627] transition hover:bg-white/90"
          >
            Explore products
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <span className="pointer-events-none absolute -right-20 -bottom-28 size-80 rounded-full bg-white/10" />
      </section>

      <section>
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">How it works</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            From browsing to buying, on your terms.
          </h2>
        </div>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-tint text-brand">
                <Icon className="size-5" />
              </span>
              <p className="mt-4 text-xs font-bold tracking-wider text-ink-soft uppercase">
                Step {index + 1}
              </p>
              <h3 className="mt-1 text-base font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-5 rounded-2xl border border-border bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
        <div>
          <h2 className="text-lg font-bold text-ink">A note about purchases</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            MT Store helps you discover and compare products. When you choose a retailer offer,
            you continue to that retailer’s site, where its checkout, availability, shipping, and
            return terms apply. Freebie campaigns are a separate feature with their own eligibility
            and referral requirements.
          </p>
        </div>
        <Link
          href="/faq"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-brand hover:bg-brand-tint hover:text-brand"
        >
          Read the FAQs
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <ProductSuggestions />
    </div>
  );
}
