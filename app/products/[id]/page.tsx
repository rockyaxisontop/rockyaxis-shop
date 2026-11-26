import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/add-to-cart";
import { ProductRecommendationsView, ProductView } from "@/components/product-view";
import { getProduct } from "@/lib/products/service";
import { getCurrencyContext } from "@/lib/currency/server";
import { storeListPrice, storePrice } from "@/lib/discount";
import { discountPercent, formatMoney } from "@/lib/format";
import { safeJsonLd } from "@/lib/json-ld";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const product = await getProduct(id);
    const description = product.description?.slice(0, 160);
    // Variant links differ only by query string — point them at the clean URL.
    const canonical = `/products/${encodeURIComponent(id)}`;
    const image = product.images?.[0]?.url;
    return {
      title: product.title,
      description,
      alternates: { canonical },
      openGraph: {
        type: "website",
        title: product.title,
        description,
        url: canonical,
        images: image ? [{ url: image, alt: product.title }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: product.title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: "Product", robots: { index: false, follow: true } };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;

  let product;
  try {
    // eBay listings are stored under the id in the URL; nothing to resolve from
    // the query string beyond that.
    product = await getProduct(id);
  } catch {
    notFound();
  }

  const { currency } = await getCurrencyContext();
  const offers = product.offers ?? [];
  const lowestOffer = offers.reduce<(typeof offers)[number] | undefined>(
    (best, offer) =>
      offer.price?.price != null && (best == null || offer.price.price < (best.price?.price ?? Infinity))
        ? offer
        : best,
    undefined,
  );

  // Structured data for rich results: price, availability and brand exactly as
  // shown on the page (our discounted selling price, in the visitor's currency).
  const productJsonLd =
    lowestOffer?.price?.price != null
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.description?.slice(0, 500),
          image: product.images?.map((image) => image.url).filter(Boolean),
          sku: product.id,
          brand: product.brands?.[0]?.name
            ? { "@type": "Brand", name: product.brands[0].name }
            : undefined,
          category: product.category?.title,
          offers: {
            "@type": "Offer",
            url: absoluteUrl(`/products/${encodeURIComponent(product.id)}`),
            price: storePrice(lowestOffer.price.price, currency),
            priceCurrency: currency,
            availability: offers.some((offer) => offer.availability === "InStock")
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: SITE_NAME },
          },
        }
      : null;

  return (
    <div className="flex flex-col gap-6 sm:gap-12">
      {productJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
        />
      ) : null}
      {/* Matches the visible breadcrumb below, so results show the page trail. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Search", item: absoluteUrl("/search") },
              ...(product.category?.title
                ? [
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: product.category.title,
                      item: absoluteUrl(`/search?q=${encodeURIComponent(product.category.title)}`),
                    },
                  ]
                : []),
              // Product is always the final step, whatever came before it.
              {
                "@type": "ListItem",
                position: product.category?.title ? 4 : 3,
                name: product.title,
                item: absoluteUrl(`/products/${encodeURIComponent(product.id)}`),
              },
            ].map((entry, index) => ({ ...entry, position: index + 1 })),
          }),
        }}
      />
      <nav aria-label="Breadcrumb" className="truncate text-sm text-ink-soft">
        <Link href="/search" className="hover:text-foreground">
          Search
        </Link>
        {product.category?.title ? (
          <>
            <span className="px-1.5" aria-hidden>
              /
            </span>
            <span>{product.category.title}</span>
          </>
        ) : null}
      </nav>

      <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
          <ProductView product={product} currency={currency} />
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
                    {formatMoney(storePrice(lowestOffer.price.price, currency), currency)}
                  </p>
                  <p className="text-sm text-ink-soft line-through">
                    {formatMoney(storeListPrice(lowestOffer.price.price, currency), currency)}
                  </p>
                  <span className="rounded-full bg-stock-bg px-2 py-1 text-[11px] font-bold text-stock">
                    Save {discountPercent(lowestOffer.price)}%
                  </span>
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


