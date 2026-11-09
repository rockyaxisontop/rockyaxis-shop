import Image from "next/image";
import Link from "next/link";
import type { Product } from "@channel3/sdk/resources";

import type { SuggestedGroup } from "@/lib/channel3/products";

/**
 * Daily-life suggestions shown before the user types anything.
 * Server-rendered from `getSuggestedProducts` so it costs no client JS.
 */
export function SuggestedProducts({ groups }: { groups: SuggestedGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <section className="flex flex-col gap-10 pt-4">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{group.title}</h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-muted">
        {product.images?.[0]?.url ? (
          <Image
            src={product.images[0].url}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
        {product.brands?.[0]?.name ? (
          <p className="text-xs text-muted-foreground">{product.brands[0].name}</p>
        ) : null}
        <p className="mt-auto pt-1 text-sm font-semibold">
          {cheapest?.price?.price != null
            ? new Intl.NumberFormat("en", {
              style: "currency",
              currency: cheapest.price.currency ?? "USD",
            }).format(cheapest.price.price)
            : "—"}
        </p>
      </div>
    </Link>
  );
}
