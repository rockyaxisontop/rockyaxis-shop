import type { Metadata } from "next";

import { SearchExperience } from "@/components/search-experience";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Live results from every store Channel3 can reach.
        </p>
      </div>

      <SearchExperience />
    </div>
  );
}
