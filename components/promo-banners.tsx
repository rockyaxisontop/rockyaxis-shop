import Link from "next/link";
import { ArrowRight, Sparkles, Truck } from "lucide-react";

/** Two wide promo banners, matching the reference site's gradient cards. */
export function PromoBanners() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      <Link
        href="/search?q=headphones"
        className="group relative flex min-h-32 flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#f36d25] to-[#ee385e] p-5 text-white sm:min-h-40 sm:p-7"
      >
        <span className="mb-1 flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur">
          <Sparkles className="size-3" />
          Limited time
        </span>
        <p className="text-xl font-extrabold tracking-tight sm:text-2xl">Up to 40% off audio</p>
        <p className="mt-1 text-xs text-white/85 sm:text-sm">Earbuds, headphones and speakers.</p>
        <span className="mt-3 flex w-fit items-center gap-1 text-xs font-bold uppercase">
          Shop the sale
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
        <span className="pointer-events-none absolute -right-6 -bottom-8 size-32 rounded-full bg-white/10" />
      </Link>

      <Link
        href="/search?q=laptops"
        className="group relative flex min-h-32 flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#011627] via-[#1d7fa4] to-[#2da9d6] p-5 text-white sm:min-h-40 sm:p-7"
      >
        <span className="mb-1 flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur">
          <Truck className="size-3" />
          Free delivery
        </span>
        <p className="text-xl font-extrabold tracking-tight sm:text-2xl">New laptops, in stock</p>
        <p className="mt-1 text-xs text-white/85 sm:text-sm">Work, study and gaming picks.</p>
        <span className="mt-3 flex w-fit items-center gap-1 text-xs font-bold uppercase">
          Explore
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
        <span className="pointer-events-none absolute -right-6 -bottom-8 size-32 rounded-full bg-white/10" />
      </Link>
    </section>
  );
}
