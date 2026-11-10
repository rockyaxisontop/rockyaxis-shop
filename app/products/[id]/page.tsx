import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/add-to-cart";
import { ProductRecommendationsView, ProductView } from "@/components/product-view";
import { getProduct } from "@/lib/channel3/products";
import { discountPercent } from "@/lib/format";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const product = await getProduct(id);
    return {
      title: product.title,
      description: product.description?.slice(0, 160),
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  let product;
  try {
    // Variant links carry the selected options in the query string so the
    // server resolves the exact purchasable product.
    const selected_options = Object.fromEntries(
      Object.entries(resolvedSearchParams).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );

    product = await getProduct(id, { selected_options });
  } catch {
    notFound();
  }

  const offers = product.offers ?? [];
  const lowestOffer = offers.reduce<(typeof offers)[number] | undefined>(
    (best, offer) =>
      offer.price?.price != null && (best == null || offer.price.price < (best.price?.price ?? Infinity))
        ? offer
        : best,
    undefined,
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-12">
      <nav aria-label="Breadcrumb" className="truncate text-sm text-ink-soft">
        <Link href="/search" className="hover:text-foreground">
          Search
        </Link>
        {product.category?.title ? (
          <>
            <span className="px-1.5">/</span>
            <span>{product.category.title}</span>
          </>
        ) : null}
      </nav>

      <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
          <ProductView product={product} />
        </div>

        <aside className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
            <div>
              {product.brands?.[0]?.name ? (
                <p className="text-xs font-bold tracking-widest text-brand uppercase">
                  {product.brands[0].name}
                </p>
              ) : null}
              <h1 className="mt-1 text-xl leading-snug font-bold tracking-tight text-ink sm:text-2xl">{product.title}</h1>
            </div>

            {lowestOffer?.price?.price != null ? (
              <div className="rounded-xl bg-surface-2 p-4">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <p className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    {formatPrice(lowestOffer.price.price, lowestOffer.price.currency ?? "USD")}
                  </p>
                  {lowestOffer.price.compare_at_price != null &&
                  lowestOffer.price.compare_at_price > lowestOffer.price.price ? (
                    <>
                      <p className="text-sm text-ink-soft line-through">
                        {formatPrice(lowestOffer.price.compare_at_price, lowestOffer.price.currency ?? "USD")}
                      </p>
                      <span className="rounded-full bg-stock-bg px-2 py-1 text-[11px] font-bold text-stock">
                        Save {discountPercent(lowestOffer.price)}%
                      </span>
                    </>
                  ) : null}
                </div>
                {offers.length > 1 ? (
                  <p className="mt-1 text-xs text-ink-soft">
                    Best of {offers.length} retailer offers
                  </p>
                ) : null}
              </div>
            ) : null}

            <AddToCart
              productId={product.id}
              title={product.title}
              image={product.images?.[0]?.url}
              brand={product.brands?.[0]?.name}
              currency={lowestOffer?.price?.currency ?? "USD"}
              price={lowestOffer?.price?.price ?? 0}
              url={lowestOffer?.url}
              options={Object.fromEntries(
                (product.variants?.selected ?? []).map((option) => [option.name, option.label]),
              )}
            />
          </div>
        </aside>
      </div>

      <ProductRecommendationsView productId={product.id} />
    </div>
  );
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
