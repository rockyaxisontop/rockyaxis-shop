"use client";

import { useEffect, useRef, useState } from "react";

import {
  AD_NATIVE_ID,
  AD_SMARTLINK,
  loadNativeBanner,
  renderBanner728,
} from "@/lib/ads";

export type AdSlotVariant = "banner" | "native" | "smartlink" | "strip";

/**
 * One ad placement.
 *
 * Every variant is self-labelled ("Sponsored") and sits inside the normal page
 * rhythm, so the visitor keeps seeing real content and the ads never cover it.
 * Renders nothing at all on /message — the chat is deliberately ad-free.
 */
export function AdSlot({
  variant = "native",
  label = "Sponsored",
  className = "",
}: {
  variant?: AdSlotVariant;
  label?: string;
  className?: string;
}) {
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const nativeRef = useRef<HTMLDivElement | null>(null);
  // Set when this slot lost the race for the page's single 728x90.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (variant !== "banner" || !bannerRef.current) return;
    const host = bannerRef.current;
    const parent = host.parentElement;
    if (!host || !parent) return;

    // One 728x90 per page: on repeat placements show the smartlink card instead
    // (a second iframe would overwrite the global atOptions and kill the first).
    if (document.querySelector("[data-ad-728]")) {
      setCollapsed(true);
      return;
    }

    host.setAttribute("data-ad-728", "1");
    renderBanner728(host);
  }, [variant]);

  useEffect(() => {
    if (variant !== "native" || !nativeRef.current) return;
    loadNativeBanner();
  }, [variant]);

  if (variant === "banner") {
    if (collapsed) return <AdSlot variant="strip" label={label} className={className} />;
    return (
      <aside
        aria-label="Advertisement"
        className={`mx-auto w-full max-w-3xl px-3 ${className}`}
      >
        <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft/70">
          {label}
        </p>
        <div className="flex min-h-[92px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-white/60">
          <div ref={bannerRef} className="flex items-center justify-center" />
        </div>
      </aside>
    );
  }

  if (variant === "native") {
    return (
      <aside
        aria-label="Advertisement"
        className={`mx-auto w-full max-w-3xl px-3 ${className}`}
      >
        <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft/70">
          {label}
        </p>
        <div
          ref={nativeRef}
          id={`container-${AD_NATIVE_ID}`}
          className="min-h-[120px] w-full overflow-hidden rounded-2xl border border-border bg-white"
        />
      </aside>
    );
  }

  if (variant === "strip") {
    // Slim, inline, thumbs-friendly: reads like a card, not a pop-up.
    return (
      <aside
        aria-label="Advertisement"
        className={`mx-auto w-full max-w-3xl px-3 ${className}`}
      >
        <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft/70">
          {label}
        </p>
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

  return null;
}

/** Dense block of native units — used after long lists and in landing pages. */
export function AdCluster({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <AdSlot variant="banner" label="Sponsored" />
      <AdSlot variant="native" label="You might also like" />
    </div>
  );
}
