"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Category tiles with photography.
 *
 * Images are fixed Unsplash URLs, not catalogue lookups: they cost nothing, need
 * no API call and no Firestore read, and never break when a retailer CDN does.
 * Only the first 8 show by default — eighteen tiles pushed the real products far
 * below the fold — with a "View more" toggle for the rest.
 */
const CATEGORIES = [
  { label: "Smartphones", q: "smartphones", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=70" },
  { label: "Laptops", q: "laptops", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=70" },
  { label: "Headphones", q: "headphones", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=70" },
  { label: "Smartwatches", q: "smartwatches", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=70" },
  { label: "Gaming", q: "gaming console accessories", image: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=400&q=70" },
  { label: "Cameras", q: "cameras", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=70" },
  { label: "Speakers", q: "speakers", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=70" },
  { label: "TV & Video", q: "TV video", image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&q=70" },
  { label: "Tablets", q: "tablets", image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=70" },
  { label: "Home & Kitchen", q: "home kitchen", image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&q=70" },
  { label: "Fashion", q: "fashion clothing", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=70" },
  { label: "Beauty", q: "beauty skincare", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=70" },
  { label: "Sports & Outdoors", q: "sports outdoor fitness", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=70" },
  { label: "Office & Study", q: "office desk study", image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&q=70" },
  { label: "Baby & Kids", q: "baby kids toys", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=70" },
  { label: "Books & Media", q: "books stationery", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=70" },
  { label: "Car & Bike", q: "car bike accessories", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=70" },
  { label: "Drones", q: "drones camera", image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&q=70" },
];

const INITIAL_COUNT = 8;

/** Photo tiles under "Shop by Category", 8 at a time. */
export function CategoryTiles() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? CATEGORIES : CATEGORIES.slice(0, INITIAL_COUNT);

  return (
    <section id="shop-by-category" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink sm:text-[22px]">Shop by Category</h2>
          <p className="mt-0.5 text-xs text-ink-soft">Every category, at {`80%`} off the listed price.</p>
        </div>
        <Link
          href="/search"
          className="pb-0.5 text-[11px] font-bold tracking-wide text-brand uppercase hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {visible.map(({ label, q, image }) => {
          const href = `/search?q=${encodeURIComponent(q)}`;
          return (
            <Link
              key={q}
              href={href}
              // Prefetch on intent only — prefetching every tile on load made
              // every tap feel slow.
              prefetch={false}
              onMouseEnter={() => router.prefetch(href)}
              onFocus={() => router.prefetch(href)}
              onTouchStart={() => router.prefetch(href)}
              className="group relative flex aspect-[4/3] touch-manipulation items-end overflow-hidden rounded-xl border border-border bg-surface-2 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md active:scale-[0.98]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Readability scrim behind the label. */}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="relative z-10 w-full p-2.5 text-[12px] leading-tight font-extrabold text-white drop-shadow sm:text-sm">
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className={cn(
          "mx-auto inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-white px-4 text-xs font-bold text-ink transition hover:border-brand hover:text-brand",
        )}
      >
        {expanded ? (
          <>
            Show less <ChevronUp className="size-3.5" />
          </>
        ) : (
          <>
            View more categories ({CATEGORIES.length - INITIAL_COUNT}) <ChevronDown className="size-3.5" />
          </>
        )}
      </button>
    </section>
  );
}
