import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/add-to-cart";
import { ProductRecommendationsView, ProductView } from "@/components/product-view";
import { getProduct } from "@/lib/channel3/products";

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
      <nav className="truncate text-sm text-muted-foreground">
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
        <div className="min-w-0">
          <ProductView product={product} />
        </div>

        <aside className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:gap-4 sm:p-5">
            <div>
              <h1 className="text-lg leading-snug font-semibold tracking-tight sm:text-xl">{product.title}</h1>
              {product.brands?.[0]?.name ? (
                <p className="text-sm text-muted-foreground">{product.brands[0].name}</p>
              ) : null}
            </div>

            {lowestOffer?.price?.price != null ? (
              <p className="text-xl font-semibold sm:text-2xl">
                {formatPrice(lowestOffer.price.price, lowestOffer.price.currency ?? "USD")}
                {offers.length > 1 ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    across {offers.length} stores
                  </span>
                ) : null}
              </p>
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
