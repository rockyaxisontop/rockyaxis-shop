"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Tag, Truck } from "lucide-react";

import { STORE_DISCOUNT_PERCENT } from "@/lib/discount";

/** Big Billion Days campaign; every product is sold by us below list price. */
export function PromoBanners() {
  const router = useRouter();
  // Prefetch on intent: taps land instantly without loading /search eagerly.
  const intent = (href: string) => ({
    prefetch: false as const,
    onMouseEnter: () => router.prefetch(href),
    onFocus: () => router.prefetch(href),
    onTouchStart: () => router.prefetch(href),
  });

  return (
    <section className="grid gap-3 md:grid-cols-[1.35fr_0.85fr] md:gap-4">
      <Link
        href="/search"
        {...intent("/search")}
        className="group relative flex min-h-56 items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#8f1d24] via-[#df3c2f] to-[#f47535] p-5 text-white shadow-sm transition hover:shadow-lg active:scale-[0.995] sm:min-h-64 sm:p-8"
      >
        <div className="relative z-10 max-w-md sm:max-w-[calc(100%-9rem)]">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="size-3.5" />
            Big Billion Days
          </span>
          <h2 className="text-3xl leading-none font-black sm:text-5xl">
            {STORE_DISCOUNT_PERCENT}% OFF EVERYTHING
          </h2>
          <p className="mt-2 max-w-xs text-sm text-white/90 sm:text-base">
            Every product, every category — {STORE_DISCOUNT_PERCENT}% off the listed price, applied
            automatically.
          </p>
          <span className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-xs font-bold text-[#a6241e] transition group-hover:bg-[#fff3db]">
            Explore products
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
        {/* Decorative stamp: hidden on phones where it would sit on the headline. */}
        <span className="pointer-events-none absolute top-6 right-6 hidden size-28 shrink-0 rotate-6 place-items-center rounded-full border-2 border-dashed border-[#ffd766] text-center text-xs leading-tight font-extrabold text-[#ffd766] sm:grid md:top-auto md:right-10 md:size-36 md:text-base">
          ALL
          <br />
          PRODUCTS
        </span>
        <span className="pointer-events-none absolute -right-16 -bottom-28 h-64 w-64 rounded-full border-[36px] border-white/10" />
      </Link>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
        <Link
          href="/search?q=headphones speakers"
          {...intent("/search?q=headphones speakers")}
          className="group flex min-h-28 touch-manipulation flex-col justify-center rounded-2xl bg-[#f2a900] p-5 text-[#27251f] transition hover:brightness-105 active:scale-[0.99] sm:min-h-0 md:min-h-0"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase">
            <Tag className="size-3.5" />
            Audio picks
          </span>
          <span className="mt-2 text-xl font-extrabold">Sound, sorted.</span>
          <span className="mt-1 flex items-center gap-1 text-xs font-semibold">
            Shop audio <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/search?q=laptops"
          {...intent("/search?q=laptops")}
          className="group flex min-h-28 touch-manipulation flex-col justify-center rounded-2xl bg-[#087e83] p-5 text-white transition hover:brightness-110 active:scale-[0.99] sm:min-h-0 md:min-h-0"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase">
            <Truck className="size-3.5" />
            Work, study, play
          </span>
          <span className="mt-2 text-xl font-extrabold">Find your next laptop.</span>
          <span className="mt-1 flex items-center gap-1 text-xs font-semibold">
            Browse laptops <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
