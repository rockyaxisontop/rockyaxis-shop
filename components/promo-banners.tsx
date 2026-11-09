import Link from "next/link";
import { ArrowRight, Sparkles, Tag, Truck } from "lucide-react";

/** Storewide offer poster plus two department shortcuts. */
export function PromoBanners() {
  return (
    <section className="grid gap-3 md:grid-cols-[1.35fr_0.85fr] md:gap-4">
      <Link
        href="/search?q=discount deals"
        className="group relative flex min-h-56 items-center justify-between gap-4 overflow-hidden rounded-xl bg-[#df3c2f] p-5 text-white sm:min-h-64 sm:p-8"
      >
        <div className="relative z-10 max-w-md">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase">
            <Sparkles className="size-3.5" />
            The everything sale
          </span>
          <h2 className="text-3xl leading-none font-black sm:text-5xl">UP TO 80% OFF</h2>
          <p className="mt-2 max-w-xs text-sm text-white/90 sm:text-base">
            Deals across tech, home, fashion and more.
          </p>
          <span className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-xs font-bold text-[#a6241e] transition group-hover:bg-[#fff3db]">
            Explore offers
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
        <span className="pointer-events-none absolute right-5 grid size-24 shrink-0 rotate-6 place-items-center rounded-full border-[5px] border-dashed border-[#ffd766] text-center text-xs leading-tight font-extrabold text-[#ffd766] sm:right-10 sm:size-36 sm:text-base">
          LIVE
          <br />
          PRICES
        </span>
        <span className="pointer-events-none absolute -right-16 -bottom-28 h-64 w-64 rounded-full border-[36px] border-white/10" />
      </Link>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
        <Link
          href="/search?q=headphones speakers"
          className="group flex min-h-28 flex-col justify-center rounded-xl bg-[#f2a900] p-5 text-[#27251f] transition hover:brightness-105 sm:min-h-0 md:min-h-0"
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
          className="group flex min-h-28 flex-col justify-center rounded-xl bg-[#087e83] p-5 text-white transition hover:brightness-110 sm:min-h-0 md:min-h-0"
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
