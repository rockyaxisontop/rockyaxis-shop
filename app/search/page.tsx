import type { Metadata } from "next";

import { SearchExperience } from "@/components/search-experience";
import { SuggestedProducts } from "@/components/suggested-products";
import { getSuggestedProducts } from "@/lib/channel3/products";

export const metadata: Metadata = { title: "Search" };

// Suggestions are re-fetched at most every 30 minutes.
export const revalidate = 1800;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
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
