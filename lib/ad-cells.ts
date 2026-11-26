/**
 * Pure helpers for placing sponsored cells inside a product grid.
 *
 * Deliberately NOT a client module: `ProductGrid` is a server component (the
 * homepage renders it), and a server component cannot call a function exported
 * from a `"use client"` file — only render it. Keeping the data logic here means
 * both server and client grids can use it.
 */

/** A placeholder cell produced by {@link withInFeedAds}. */
export type AdCell = { __ad: number };

/**
 * Drops an in-feed ad card into a product grid after `every` items.
 *
 * The card stays inside the grid so the layout never jumps: it occupies the
 * exact cell a product would. Nothing is inserted after the last item.
 */
export function withInFeedAds<T>(
  items: ReadonlyArray<T>,
  every = 6,
  offset = 0,
): Array<T | AdCell> {
  if (every <= 0) return [...items];
  const out: Array<T | AdCell> = [];
  items.forEach((item, index) => {
    out.push(item);
    const placed = index + 1 + offset;
    if (placed % every === 0 && index < items.length - 1) {
      out.push({ __ad: out.length });
    }
  });
  return out;
}

export function isAdCell<T>(cell: T | AdCell): cell is AdCell {
  return typeof cell === "object" && cell !== null && "__ad" in (cell as object);
}
