"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { AD_SMARTLINK, dealOffer, dealWasOpened, markDealOpened } from "@/lib/ads";

/**
 * The "greedy" partner-offer button.
 *
 * A small, clearly-labelled CTA whose destination is our ad link. It is
 * deliberately understated: dashed border, a "Sponsored" micro-label and a
 * single line of copy, so it reads as a partner card rather than something
 * pretending to be store navigation. Once pressed, that placement stays quiet
 * for the rest of the session.
 */
export function PartnerDealButton({
  placement,
  index = 0,
  className = "",
  tone = "inline",
}: {
  /** Stable id for this placement (used to remember the click). */
  placement: string;
  index?: number;
  className?: string;
  /** `inline` sits in a row of text; `block` is a full-width card. */
  tone?: "inline" | "block";
}) {
  const offer = dealOffer(index);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    setOpened(dealWasOpened(placement));
  }, [placement]);

  const base =
    "group items-center gap-2 rounded-full border border-dashed border-brand/50 bg-brand/10 text-xs font-semibold text-ink transition hover:border-brand hover:bg-brand hover:text-ink active:scale-[0.98]";
  const layout =
    tone === "block"
      ? "flex w-full justify-between px-4 py-3 rounded-2xl"
      : "inline-flex px-3 py-1.5";

  return (
    <div className={cn("flex", tone === "block" ? "w-full" : "flex-wrap items-center gap-2", className)}>
      <a
        href={AD_SMARTLINK}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`Sponsored partner offer: ${offer.line}`}
        onClick={() => {
          markDealOpened(placement);
          setOpened(true);
        }}
        className={cn(base, layout, opened && "opacity-70")}
      >
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="text-[13px] leading-none">✦</span>
          {offer.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {tone === "block" ? (
            <span className="text-[11px] font-medium text-ink-soft group-hover:text-ink">{offer.line}</span>
          ) : null}
          <span aria-hidden className="text-[13px] leading-none">→</span>
        </span>
      </a>
      <span className="text-[9px] font-semibold tracking-[0.14em] text-ink-soft/70 uppercase">
        Sponsored
      </span>
    </div>
  );
}

/**
 * A slim sponsored strip used BETWEEN two blocks of content (product rows,
 * cart items, form and suggestions). Lighter than the native unit, so it can
 * appear more than once without dominating the page.
 */
export function SponsoredStrip({
  label = "Sponsored",
  headline = "Today's hand-picked deals",
  subline = "Exclusive partner offers — open in a new tab",
  placement,
  className = "",
}: {
  label?: string;
  headline?: string;
  subline?: string;
  placement: string;
  className?: string;
}) {
  return (
    <aside aria-label="Advertisement" className={cn("mx-auto w-full", className)}>
      <p className="mb-1 text-center text-[10px] font-medium tracking-[0.18em] text-ink-soft/70 uppercase">
        {label}
      </p>
      <a
        href={AD_SMARTLINK}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => markDealOpened(placement)}
        className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-3 transition hover:border-brand/50 hover:bg-white"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{headline}</span>
          <span className="block truncate text-xs text-ink-soft">{subline}</span>
        </span>
        <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">
          View
        </span>
      </a>
    </aside>
  );
}
