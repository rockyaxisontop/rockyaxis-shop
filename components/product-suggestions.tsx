import { SuggestedProducts } from "@/components/suggested-products";
import { getSuggestedProducts } from "@/lib/channel3/products";

/** Compact store discovery feed for pages beyond the homepage. */
export async function ProductSuggestions() {
  const groups = await getSuggestedProducts(4, ["trending", "home", "tech"]);
  return <SuggestedProducts groups={groups} />;
}
