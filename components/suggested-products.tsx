import Image from "next/image";
import Link from "next/link";
import type { Product } from "@channel3/sdk/resources";

import type { SuggestedGroup } from "@/lib/channel3/products";
import { discountPercent, formatCurrency } from "@/lib/format";

/**
 * Daily-life suggestions shown before the user types anything.
 * Server-rendered from `getSuggestedProducts` so it costs no client JS.
 */
export function SuggestedProducts({ groups }: { groups: SuggestedGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <section className="flex flex-col gap-8 pt-2 sm:gap-10 sm:pt-4">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-3 sm:gap-4">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">{group.title}</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {group.products.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProductTile({ product }: { product: Product }) {
  const offers = product.offers ?? [];
  const cheapest = offers.reduce<(typeof offers)[number] | undefined>(
    (best, offer) =>
      offer.price?.price != null && (best == null || offer.price.price < (best.price?.price ?? Infinity))
        ? offer
        : best,
    undefined,
  );
  const savings = cheapest ? discountPercent(cheapest.price) : null;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md active:opacity-90"
    >
      <div className="relative aspect-[4/3] bg-surface-2 sm:aspect-square">
        {product.images?.[0]?.url ? (
          <Image
            src={product.images[0].url}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {savings !== null && savings > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-save px-2 py-1 text-[10px] font-extrabold text-ink">
            {savings}% off
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
        <p className="line-clamp-2 text-[13px] leading-snug font-medium sm:text-sm">{product.title}</p>
        {product.brands?.[0]?.name ? (
          <p className="truncate text-xs text-muted-foreground">{product.brands[0].name}</p>
        ) : null}
        {cheapest?.price?.price != null ? (
          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
            <p className="text-sm font-bold text-ink">
              {formatCurrency(cheapest.price.price, cheapest.price.currency ?? "USD")}
            </p>
            {cheapest.price.compare_at_price && savings !== null ? (
              <p className="text-xs text-ink-soft line-through">
                {formatCurrency(cheapest.price.compare_at_price, cheapest.price.currency ?? "USD")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-auto pt-1 text-sm font-semibold">—</p>
        )}
      </div>
    </Link>
  );
}
