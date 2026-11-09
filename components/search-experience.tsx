"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@channel3/sdk/resources";

import { ProductSearch } from "@/components/product-search";
import { Button } from "@/components/ui/button";
import { fetchProductSearch, productSearchFetcher } from "@/lib/channel3/client-search";

/**
 * Official Channel3 `product-search` block – filters, image search and
 * infinite scroll included. It's presentational: all data goes through
 * `productSearchFetcher`, which calls our /api/channel3 proxy so the API key
 * never reaches the browser.
 */
export function SearchExperience({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();

  return (
    <ProductSearch
      key={initialQuery}
      fetchSearch={productSearchFetcher}
      filtersLayout="sidebar"
      searchOnMount
      initialQuery={initialQuery}
      imageSearch
      onSelect={(product: Product) => router.push(`/products/${product.id}`)}
    />
  );
}

/** Kept as a plain search box if you ever want to remove the Channel3 block. */
export function FallbackSearch({ onSelect }: { onSelect: (product: Product) => void }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const result = await fetchProductSearch({ query, limit: 24 });
      setProducts(result.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={run} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search anything – sneakers, lamps, jackets…"
          className="h-11 w-full max-w-xl rounded-lg border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" className="h-11 px-6" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {searched && !loading && !error && products.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">No products found.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const offer = product.offers?.[0];
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product)}
              className="group rounded-xl border text-left transition-shadow hover:shadow-md"
            >
              <div className="aspect-square overflow-hidden rounded-t-xl bg-muted">
                {product.images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0].url}
                    alt={product.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {offer ? formatPrice(offer.price?.price, offer.price?.currency) : "—"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatPrice(amount?: number, currency?: string) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
