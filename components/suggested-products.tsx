"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/products/types";

import type { SuggestedGroup } from "@/lib/products/service";
import { AdSlot } from "@/components/ad-slot";
import { PartnerDealButton } from "@/components/partner-deal";
import { useCurrency } from "@/components/currency-provider";
import { STORE_DISCOUNT_PERCENT, storeListPrice, storePrice } from "@/lib/discount";
import { formatMoney } from "@/lib/format";

/**
 * Daily-life suggestions shown before the user types anything.
 * Built from server-fetched `getSuggestedProducts` data; the client boundary is
 * only for reading the visitor's currency from context.
 */
export function SuggestedProducts({ groups }: { groups: SuggestedGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <section className="flex flex-col gap-8 pt-2 sm:gap-10 sm:pt-4">
      {/* A wide banner-type unit above the feed, so the shopper sees the offers
          card before the rows start. */}
      <AdSlot variant="banner" label="Sponsored" />

      {groups.map((group, index) => (
        <div key={group.key} className="flex flex-col gap-3 sm:gap-4">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">{group.title}</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {group.products.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>

          {/* Banner-type units BETWEEN suggestion rows: a slim strip after the
              first row, a wide feature card after the second. Alternating keeps
              the feed readable instead of turning it into an ad wall. */}
          {index === 0 && groups.length > 1 ? (
            <AdSlot variant="strip" label="Sponsored" />
          ) : null}
          {index === 1 && groups.length > 2 ? (
            <AdSlot variant="feature" label="Sponsored" creative={index} />
          ) : null}
        </div>
      ))}

      {/* A single partner-offer button under the suggestions, clearly labelled. */}
      {groups.length > 0 ? (
        <div className="flex justify-center pt-1">
          <PartnerDealButton placement="suggestions" index={1} />
        </div>
      ) : null}
    </section>
  );
}

function ProductTile({ product }: { product: Product }) {
  const { currency } = useCurrency();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = product.images?.[0]?.url;
  const offers = product.offers ?? [];
  const cheapest = offers.reduce<(typeof offers)[number] | undefined>(
    (best, offer) =>
      offer.price?.price != null && (best == null || offer.price.price < (best.price?.price ?? Infinity))
        ? offer
        : best,
    undefined,
  );
  const savings = cheapest && (cheapest.price?.price ?? 0) > 0 ? STORE_DISCOUNT_PERCENT : 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md active:opacity-90"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2 sm:aspect-square">
        {imageUrl && !imageFailed ? (
          // Plain <img>, not next/image: the optimizer fails on some retailer
          // CDNs and then renders nothing at all. This degrades gracefully.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-ink-soft">
            No image
          </span>
        )}
        {savings > 0 ? (
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
            <span className="text-sm font-bold text-ink">
              {formatMoney(storePrice(cheapest.price.price, currency), currency)}
            </span>
            <span className="text-xs text-ink-soft line-through">
              {formatMoney(storeListPrice(cheapest.price.price, currency), currency)}
            </span>
          </div>
        ) : (
          <p className="mt-auto pt-1 text-sm font-semibold">—</p>
        )}
      </div>
    </Link>
  );
}
