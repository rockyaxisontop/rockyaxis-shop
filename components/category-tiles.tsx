import Link from "next/link";
import { Headphones, Laptop, Smartphone, Speaker, Tablet, Watch } from "lucide-react";

const CATEGORIES = [
  { label: "Smartphones", icon: Smartphone, q: "smartphones" },
  { label: "Tablets", icon: Tablet, q: "tablets" },
  { label: "Laptops", icon: Laptop, q: "laptops" },
  { label: "Headphones", icon: Headphones, q: "headphones" },
  { label: "Smartwatches", icon: Watch, q: "smartwatches" },
  { label: "Speakers", icon: Speaker, q: "speakers" },
];

/** Circular icon tiles under "Shop by Category". */
export function CategoryTiles() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-[22px]">Shop by Category</h2>
        <Link
          href="/search"
          className="pb-0.5 text-[11px] font-bold tracking-wide text-brand uppercase hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
        {CATEGORIES.map(({ label, icon: Icon, q }) => (
          <Link
            key={q}
            href={`/search?q=${encodeURIComponent(q)}`}
            className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md sm:p-4"
          >
            <span className="grid size-12 place-items-center rounded-full bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:size-14">
              <Icon className="size-6" strokeWidth={1.7} />
            </span>
            <span className="text-center text-[12px] leading-tight font-medium text-ink sm:text-sm">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
