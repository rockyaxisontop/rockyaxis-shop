import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchExperience } from "@/components/search-experience";
import { SuggestedProducts } from "@/components/suggested-products";
import { getSuggestedProducts } from "@/lib/channel3/products";

type SearchPageProps = { searchParams: Promise<{ q?: string | string[] }> };

/**
 * Turns `?q=` into a meaningful title and canonical.
 *
 * A query page is worth indexing as a category landing page; the bare search
 * page with no query is a duplicate of the homepage, so it is kept out.
 */
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  if (!query) {
    return { title: "Search", alternates: { canonical: "/search" }, robots: { index: false, follow: true } };
  }

  return {
    title: `${query} — compare prices`,
    description: `Shop ${query} at MT Store. Compare live prices from thousands of stores and buy genuine tech at 80% off the listed price.`,
    alternates: { canonical: `/search?q=${encodeURIComponent(query)}` },
    openGraph: { title: `${query} — compare prices`, url: `/search?q=${encodeURIComponent(query)}` },
  };
}

// Suggestions are re-fetched at most every 30 minutes.
export const revalidate = 1800;

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Search</h1>
        <p className="text-sm text-muted-foreground">
          Live results and prices from thousands of stores.
        </p>
      </div>

      {/* The search box renders instantly; only the query needs the URL. */}
      <Suspense fallback={<div className="h-11 w-full animate-pulse rounded-full bg-surface-2" />}>
        <SearchHeading searchParams={searchParams} />
      </Suspense>

      {/* Catalogue suggestions stream in AFTER the page is usable. They used to
          be awaited up front, which made every link into /search wait on eight
          separate product queries before rendering anything. */}
      <Suspense fallback={null}>
        <Suggestions />
      </Suspense>
    </div>
  );
}

/** The client search block, resolved from the URL inside its own boundary. */
async function SearchHeading({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const initialQuery = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");
  return <SearchExperience initialQuery={initialQuery} />;
}

async function Suggestions() {
  const groups = await getSuggestedProducts(8);
  return <SuggestedProducts groups={groups} />;
}
