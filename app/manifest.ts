import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * Web app manifest — what makes the site installable.
 *
 * Browsers need: a name, 192px and 512px icons, `start_url`, and a display mode.
 * The maskable icons keep the artwork inside Android's circular safe zone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — Shop genuine tech`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#1d7fa4",
    lang: "en",
    dir: "ltr",
    categories: ["shopping", "electronics"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search products", short_name: "Search", url: "/search", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "My cart", short_name: "Cart", url: "/cart", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Freebies", short_name: "Freebies", url: "/freebie", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
