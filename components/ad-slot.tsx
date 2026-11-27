"use client";

import { useEffect, useRef, useState } from "react";

import {
  AD_NATIVE_ID,
  AD_SMARTLINK,
  loadNativeBanner,
  renderBanner728,
} from "@/lib/ads";

/**
 * The banner shapes we show.
 *
 * banner  – the 728x90 iframe (once per page, falls back to `strip` elsewhere)
 * native  – Adsterra native feed unit, sized by the network
 * in-feed – a card that sits INSIDE a product grid, same footprint as a tile
 * feature – wide "promoted store" card with a real image, used between sections
 * strip   – slim one-line card, the lightest possible unit
 * pill    – a compact always-clickable button, no image (the "greedy" CTA)
 */
export type AdSlotVariant = "banner" | "banner-row" | "native" | "in-feed" | "feature" | "strip" | "pill";

/** How long the network gets to fill the native container before we replace it. */
const NATIVE_FILL_TIMEOUT_MS = 4000;

type ImageAd = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  alt: string;
};

/** Copy/images for the click-to-smartlink cards. Rotate by index for variety. */
export const AD_CREATIVES: ImageAd[] = [
  {
    eyebrow: "Partner offer",
    title: "Up to 70% off today's finds",
    subtitle: "Hand-picked deals from our partners",
    cta: "Shop the deal",
    image:
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=480&q=60",
    alt: "Shopping bags on a bright background",
  },
  {
    eyebrow: "Sponsored",
    title: "New season, new gadgets",
    subtitle: "Limited stock at partner prices",
    cta: "See offers",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=480&q=60",
    alt: "Laptop and headphones on a desk",
  },
  {
    eyebrow: "Sponsored",
    title: "Travelling soon?",
    subtitle: "Compare partner travel deals",
    cta: "Open deals",
    image:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=480&q=60",
    alt: "Traveller looking at a map",
  },
  {
    eyebrow: "Partner offer",
    title: "Set up your home office",
    subtitle: "Chairs, lights and desk gear",
    cta: "Browse picks",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=480&q=60",
    alt: "Minimal home office desk",
  },
];

/**
 * One ad placement.
 *
 * Every variant is self-labelled ("Sponsored") and sits inside the normal page
 * rhythm, so the visitor keeps seeing real content and the ads never cover it.
 * The chat route simply never renders one.
 */
export function AdSlot({
  variant = "native",
  label = "Sponsored",
  className = "",
  creative = 0,
  slot = "",
}: {
  variant?: AdSlotVariant;
  label?: string;
  className?: string;
  /** Picks which AD_CREATIVES entry an image/button ad uses. */
  creative?: number;
  /** Stable id used to give the single native container a unique DOM node. */
  slot?: string;
}) {
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const nativeRef = useRef<HTMLDivElement | null>(null);
  // Set when this slot lost the race for the page's single 728x90.
  const [collapsed, setCollapsed] = useState(false);
  // True once we've waited long enough for the native unit to fill and it hasn't.
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    if (variant !== "banner" || !bannerRef.current) return;
    const host = bannerRef.current;
    if (!host) return;

    // One 728x90 per page: on repeat placements show the smartlink card instead
    // (a second iframe would overwrite the global atOptions and kill the first).
    if (document.querySelector("[data-ad-728]")) {
      setCollapsed(true);
      return;
    }

    host.setAttribute("data-ad-728", "1");
    renderBanner728(host);

    // If the network never paints into the iframe, swap in our own card rather
    // than leaving a bordered empty box on the page.
    window.setTimeout(() => {
      const frame = host.querySelector("iframe");
      const painted = frame && (frame.clientHeight > 40 || (frame.getAttribute("height") ?? "") !== "0");
      if (!painted) setUnfilled(true);
    }, NATIVE_FILL_TIMEOUT_MS);
  }, [variant]);

  useEffect(() => {
    if (variant !== "native" || !nativeRef.current) return;
    const host = nativeRef.current;
    if (!host) return;

    // Defer the script until the unit is close to the viewport, so it never
    // costs anything for visitors who bounce early.
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      loadNativeBanner();
      // The network injects its markup asynchronously, and sometimes not at
      // all. Give it a fair window, then show our own card instead of a blank.
      window.setTimeout(() => {
        if ((host.innerHTML ?? "").trim().length === 0) setUnfilled(true);
      }, NATIVE_FILL_TIMEOUT_MS);
    };

    if (typeof IntersectionObserver === "undefined") {
      start();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          start();
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [variant]);

  if (variant === "banner") {
    if (collapsed) return <AdSlot variant="strip" label={label} className={className} />;
    // Same rule as the native unit: the network does not always fill the iframe,
    // and a bordered empty box looks broken. Fall back to our own card instead.
    return (
      <aside aria-label="Advertisement" className={`mx-auto w-full max-w-3xl px-3 ${className}`}>
        <AdLabel label={label} />
        {unfilled ? (
          <AdSlot variant="strip" label="Sponsored" className="max-w-3xl px-0" />
        ) : (
          <div className="flex min-h-[92px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-white/60">
            <div ref={bannerRef} className="flex items-center justify-center" />
          </div>
        )}
      </aside>
    );
  }

  if (variant === "native") {
    // The network unit fills this container when it chooses to serve. It leaves
    // it empty for reasons only the network knows (frequency caps, paused
    // campaigns, bot/geo filters) — so we watch it for a short while and fall
    // back to an in-house card rather than leaving a dead 120px box.
    return (
      <aside aria-label="Advertisement" className={`mx-auto w-full max-w-3xl px-3 ${className}`}>
        <AdLabel label={label} />
        <div className="relative">
          <div
            ref={nativeRef}
            aria-hidden={unfilled}
            id={slot ? `container-${AD_NATIVE_ID}-${slot}` : `container-${AD_NATIVE_ID}`}
            className={
              unfilled
                ? "hidden"
                : "min-h-[120px] w-full overflow-hidden rounded-2xl border border-border bg-white"
            }
          />
          {unfilled ? <NativeFallbackCard /> : null}
        </div>
      </aside>
    );
  }

  if (variant === "banner-row") {
    // Full-width banner that lives INSIDE a product grid. It spans every column
    // on its own row, so the tiles above and below stay perfectly aligned.
    const ad = creativeFor(creative);
    return (
      <aside
        aria-label="Advertisement"
        className={`col-span-full min-w-0 ${className}`}
      >
        <a
          href={AD_SMARTLINK}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`Advertisement: ${ad.title}`}
          className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-brand/30 bg-gradient-to-r from-brand/5 via-white to-brand/5 p-2 transition hover:border-brand/60 hover:shadow-sm sm:gap-4 sm:p-3"
        >
          <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:h-20 sm:w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.image}
              alt={ad.alt}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute left-1 top-1 rounded-full bg-ink/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
              Ad
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold text-ink sm:text-sm">{ad.title}</span>
            <span className="block truncate text-[11px] text-ink-soft sm:text-xs">{ad.subtitle}</span>
          </span>
          <span className="hidden shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition group-hover:bg-brand group-hover:text-ink sm:inline-flex">
            {ad.cta}
          </span>
          <span aria-hidden className="shrink-0 text-ink-soft sm:hidden">›</span>
        </a>
      </aside>
    );
  }

  if (variant === "in-feed") {
    // Same footprint as a product tile, so a row stays perfectly aligned.
    const ad = creativeFor(creative);
    return (
      <a
        href={AD_SMARTLINK}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`Advertisement: ${ad.title}`}
        className={`group flex flex-col overflow-hidden rounded-2xl border border-dashed border-brand/40 bg-gradient-to-b from-brand/5 to-white transition-all hover:-translate-y-0.5 hover:border-brand/70 hover:shadow-md active:opacity-90 ${className}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-2 sm:aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.image}
            alt={ad.alt}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
            {ad.eyebrow}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
          <p className="line-clamp-2 text-[13px] leading-snug font-semibold sm:text-sm">{ad.title}</p>
          <p className="line-clamp-1 text-xs text-ink-soft">{ad.subtitle}</p>
          <span className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition group-hover:bg-brand group-hover:text-ink">
            {ad.cta}
          </span>
        </div>
      </a>
    );
  }

  if (variant === "feature") {
    // Wide card between two sections: banner-like, but native to the page.
    const ad = creativeFor(creative);
    return (
      <aside aria-label="Advertisement" className={`mx-auto w-full max-w-3xl px-3 ${className}`}>
        <a
          href={AD_SMARTLINK}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group flex items-stretch gap-3 overflow-hidden rounded-2xl border border-border bg-white transition hover:border-brand/50 hover:shadow-sm sm:gap-4"
        >
          <div className="relative w-24 shrink-0 overflow-hidden bg-surface-2 sm:w-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.image}
              alt={ad.alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-3 sm:py-4 sm:pr-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink-soft/80">
              {ad.eyebrow}
            </span>
            <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
              {ad.title}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft sm:text-sm">{ad.subtitle}</p>
            <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-ink transition group-hover:bg-ink group-hover:text-white">
              {ad.cta}
              <span aria-hidden>→</span>
            </span>
          </div>
        </a>
      </aside>
    );
  }

  if (variant === "strip") {
    // Slim, inline, thumbs-friendly: reads like a card, not a pop-up.
    return (
      <aside aria-label="Advertisement" className={`mx-auto w-full max-w-3xl px-3 ${className}`}>
        <AdLabel label={label} />
        <a
          href={AD_SMARTLINK}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-3 transition hover:border-ink/30 hover:bg-white"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">Today&apos;s hand-picked deals</span>
            <span className="block truncate text-xs text-ink-soft">
              Exclusive partner offers — open in a new tab
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">
            View
          </span>
        </a>
      </aside>
    );
  }

  if (variant === "pill") {
    // The greedy button: always clickable, never in the way.
    return (
      <a
        href={AD_SMARTLINK}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label="Advertisement: open today's partner deals"
        className={`inline-flex items-center gap-1.5 rounded-full border border-brand/50 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-brand hover:text-ink active:scale-[0.98] ${className}`}
      >
        <span aria-hidden>✦</span>
        Deals
      </a>
    );
  }

  return null;
}

function creativeFor(index: number): ImageAd {
  return AD_CREATIVES[Math.abs(index) % AD_CREATIVES.length];
}

/**
 * Shown in place of the network's native unit when it doesn't fill its
 * container.
 *
 * It deliberately mimics the *shape* of the native feed unit (a small
 * notification-style card with an icon, a headline and a CTA) so the slot still
 * reads as a sponsored recommendation instead of a gap in the page. It is our
 * own markup pointing at our ad link — no third-party script involved, so it
 * can't be blocked or left blank.
 */
function NativeFallbackCard() {
  const offers = AD_CREATIVES.slice(0, 3);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <ul className="divide-y divide-border">
        {offers.map((offer, index) => (
          <li key={offer.title}>
            <a
              href={AD_SMARTLINK}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-brand-tint"
            >
              <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={offer.image}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
                <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-brand text-[9px] font-bold text-white">
                  {index + 1}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {offer.title}
                </span>
                <span className="block truncate text-[11px] text-ink-soft">{offer.subtitle}</span>
              </span>
              <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">
                {offer.cta}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft/70">
      {label}
    </p>
  );
}

/**
 * Grid placement helpers live in `lib/ad-cells.ts` (a non-client module, so the
 * server-rendered ProductGrid can use them). Re-exported here for convenience.
 */
export { isAdCell, withInFeedAds } from "@/lib/ad-cells";

/** Dense block of network units — used after long lists and in landing pages. */
export function AdCluster({ className = "", offset = 0 }: { className?: string; offset?: number }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <AdSlot variant="banner" label="Sponsored" creative={offset} slot={`cluster-${offset}`} />
      <AdSlot variant="native" label="You might also like" slot={`cluster-${offset}`} />
    </div>
  );
}
