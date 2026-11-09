import Link from "next/link";
import {
  Camera,
  Dumbbell,
  Gamepad2,
  Headphones,
  House,
  Laptop,
  Shirt,
  Smartphone,
  Sparkles,
  Speaker,
  Tablet,
  Tv,
  Watch,
} from "lucide-react";

const CATEGORIES = [
  { label: "Smartphones", icon: Smartphone, q: "smartphones" },
  { label: "Tablets", icon: Tablet, q: "tablets" },
  { label: "Laptops", icon: Laptop, q: "laptops" },
  { label: "Headphones", icon: Headphones, q: "headphones" },
  { label: "Smartwatches", icon: Watch, q: "smartwatches" },
  { label: "Speakers", icon: Speaker, q: "speakers" },
  { label: "TV & Video", icon: Tv, q: "TV video" },
  { label: "Cameras", icon: Camera, q: "cameras" },
  { label: "Home & Kitchen", icon: House, q: "home kitchen" },
  { label: "Fashion", icon: Shirt, q: "fashion clothing" },
  { label: "Beauty", icon: Sparkles, q: "beauty skincare" },
  { label: "Sports & Outdoors", icon: Dumbbell, q: "sports outdoor fitness" },
  { label: "Gaming", icon: Gamepad2, q: "gaming" },
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

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
        {CATEGORIES.map(({ label, icon: Icon, q }) => (
          <Link
            key={q}
            href={`/search?q=${encodeURIComponent(q)}`}
            className="group flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md sm:min-h-32 sm:p-3"
          >
            <span className="grid size-11 place-items-center rounded-lg bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:size-12">
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
