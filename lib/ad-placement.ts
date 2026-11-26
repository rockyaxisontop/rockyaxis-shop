import type { AdSlotVariant } from "@/components/ad-slot";

/**
 * Ad placement schedule.
 *
 * One place decides which units appear where, so every page follows the same
 * rhythm and the site never turns into an ad wall:
 *
 *   • a row break  — thin "sponsored" strip BETWEEN two product rows
 *   • an in-feed   — a card-sized native unit INSIDE a product grid
 *   • a button     — a small, clearly-labelled call-to-action link
 *
 * Rules of thumb baked in below: never more than one unit between two rows,
 * one in-feed card per ~8 products, and nothing inside the first screenful or
 * near the checkout CTA. Every unit is self-labelled "Sponsored".
 */

/** Spacing between in-feed cards inside a product grid. */
export const IN_FEED_EVERY = 8;

export type RowBreak = { variant: AdSlotVariant; label: string };

/**
 * The unit that follows the Nth product row (1-based). A null means "no ad
 * after this row" — alternating keeps long category lists readable.
 */
export function rowBreakAfter(rowNumber: number): RowBreak | null {
  if (rowNumber <= 1) return null; // first row stays clean
  switch (rowNumber) {
    case 2:
      return { variant: "strip", label: "Sponsored" };
    case 4:
      return { variant: "feature", label: "Sponsored" };
    case 6:
      return { variant: "strip", label: "Sponsored" };
    default:
      return rowNumber % 3 === 1 ? { variant: "strip", label: "Sponsored" } : null;
  }
}

/**
 * In-feed placement inside a grid. The slot ID must be unique per card across
 * the whole page (the native network sizes each container by id), so callers
 * pass a page-unique prefix.
 */
export function inFeedSlot(prefix: string, index: number): string {
  return `${prefix}-feed-${index}`;
}

/** Label shown on the in-feed card, rotated so the grid doesn't repeat itself. */
export function inFeedCreative(index: number): number {
  return index / IN_FEED_EVERY;
}
