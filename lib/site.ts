/**
 * Canonical site identity, shared by metadata, the sitemap and robots.txt.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL  — set this to your custom domain when you have one
 *  2. Vercel's production URL (set automatically on Vercel)
 *  3. localhost, for local development
 */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "MT Store";

export const SITE_TAGLINE = "Shop genuine tech at the best price";

export const SITE_DESCRIPTION =
  "Shop phones, laptops, headphones, smartwatches and more at MT Store. Compare live prices from thousands of stores and every product at 80% off the listed price, delivered across Nepal.";

export const SITE_LOCALE = "en_NP";

export const SITE_CONTACT = {
  email: "support@mtstore.com",
  phone: "+977-9714501791",
  city: "Lalitpur",
  region: "Kathmandu Valley",
  country: "Nepal",
} as const;

export const SITE_SOCIAL = [
  "https://instagram.com/maketrendstore",
  "https://facebook.com/maketrendstore",
  "https://www.youtube.com/@maketrendstore",
  "https://www.tiktok.com/@maketrendstore",
] as const;

/** Absolute URL for a route path. */
export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Pages that must never be indexed (they need a signed-in user or are private). */
export const PRIVATE_ROUTES = ["/cart", "/checkout", "/profile", "/login", "/freebie/mine", "/freebie/order"];

export function isPrivateRoute(path: string) {
  return PRIVATE_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}
