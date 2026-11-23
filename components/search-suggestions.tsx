"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Search, TrendingUp } from "lucide-react";

import { useCurrency } from "@/components/currency-provider";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Suggestion = {
  id: string;
  title: string;
  image: string | null;
  brand: string | null;
  price: number | null;
  currency: string;
};

/** Quick chips shown before the shopper types anything. */
const POPULAR = [
  "iPhone",
  "Samsung Galaxy",
  "Laptop",
  "Headphones",
  "Smartwatch",
  "Gaming console",
  "Bluetooth speaker",
  "Tablet",
];

const RECENT_KEY = "mt-store:recent-searches";

/**
 * Live search suggestions for the header.
 *
 * Shows recent + popular searches before typing, then product results as the
 * shopper types. Results are debounced (250ms) and de-duplicated so a fast typist
 * doesn't fire a request per keystroke, and stale responses are discarded.
 */
export function SearchSuggestions({ query, onNavigate }: { query: string; onNavigate: () => void }) {
  const router = useRouter();
  const { currency } = useCurrency();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const requestId = useRef(0);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 4));
    } catch {
      setRecent([]);
    }
  }, []);

  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`);
        const body = (await response.json()) as { suggestions?: Suggestion[] };
        // Ignore a response that a newer keystroke has superseded.
        if (id !== requestId.current) return;
        setItems(body.suggestions ?? []);
      } catch {
        if (id === requestId.current) setItems([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [term]);

  function go(path: string, remember?: string) {
    if (remember) {
      try {
        const next = [remember, ...recent.filter((item) => item !== remember)].slice(0, 4);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
    onNavigate();
    router.push(path);
  }

  const showPopular = term.length < 2;
  const popularToShow = useMemo(
    () => (recent.length > 0 ? recent : POPULAR).slice(0, 6),
    [recent],
  );

  if (showPopular) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xl">
        <p className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">
          {recent.length > 0 ? <Clock3 className="size-3" /> : <TrendingUp className="size-3" />}
          {recent.length > 0 ? "Recent searches" : "Popular right now"}
        </p>
        <ul className="pb-1.5">
          {popularToShow.map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => go(`/search?q=${encodeURIComponent(item)}`, item)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-ink transition hover:bg-surface-2"
              >
                <Search className="size-3.5 shrink-0 text-ink-soft" />
                {item}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xl">
      {loading && items.length === 0 ? (
        <p className="px-3 py-3 text-xs text-ink-soft">Searching…</p>
      ) : null}

      {!loading && items.length === 0 ? (
        <button
          type="button"
          onClick={() => go(`/search?q=${encodeURIComponent(term)}`, term)}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-ink hover:bg-surface-2"
        >
          <Search className="size-3.5 text-ink-soft" />
          Search for “{term}”
        </button>
      ) : null}

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => go(`/products/${encodeURIComponent(item.id)}`, term)}
              className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition hover:bg-surface-2"
            >
              <span className="size-9 shrink-0 overflow-hidden rounded-md bg-surface-2">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="size-full object-cover" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-[11px] leading-snug font-semibold text-ink">
                  {item.title}
                </span>
                {item.brand ? (
                  <span className="block truncate text-[10px] text-ink-soft">{item.brand}</span>
                ) : null}
              </span>
              {item.price != null ? (
                <span className="shrink-0 text-[11px] font-extrabold text-ink">
                  {formatMoney(item.price, currency)}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {items.length > 0 ? (
        <button
          type="button"
          onClick={() => go(`/search?q=${encodeURIComponent(term)}`, term)}
          className={cn(
            "flex w-full items-center justify-between gap-2 border-t border-border px-3 py-2 text-[11px] font-bold text-brand transition hover:bg-brand-tint",
          )}
        >
          See all results for “{term}”
          <ArrowRight className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
