import type { MetadataRoute } from "next";

import { getSuggestedProducts } from "@/lib/channel3/products";
import { SITE_URL } from "@/lib/site";

/**
 * sitemap.xml — the public pages plus a selection of live products.
 *
 * Product pages come from the same feed the homepage uses, so the sitemap
 * never lists something we don't actually show. If the catalogue call fails the
 * static pages are still published rather than failing the whole file.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/freebie`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Popular category searches are real landing pages for shopping queries.
  const categoryQueries = [
    "smartphones",
    "laptops",
    "headphones",
    "smartwatches",
    "cameras",
    "gaming",
    "home kitchen",
    "fitness outdoor gear",
  ];
  const categoryRoutes: MetadataRoute.Sitemap = categoryQueries.map((query) => ({
    url: `${SITE_URL}/search?q=${encodeURIComponent(query)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const groups = await getSuggestedProducts(12);
    const seen = new Set<string>();
    productRoutes = groups
      .flatMap((group) => group.products)
      .filter((product) => {
        if (!product.id || seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
      })
      .map((product) => ({
        url: `${SITE_URL}/products/${encodeURIComponent(product.id)}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));
  } catch {
    // Catalogue unavailable — still publish the static and category pages.
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
