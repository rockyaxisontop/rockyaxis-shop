import type { Metadata } from "next";

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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const initialQuery = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");
  const groups = await getSuggestedProducts(8);
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Search</h1>
        <p className="text-sm text-muted-foreground">
          Live results and prices from thousands of stores.
        </p>
      </div>

      <SearchExperience initialQuery={initialQuery} />

      <SuggestedProducts groups={groups} />
    </div>
  );
}
