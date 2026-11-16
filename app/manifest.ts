import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/** Web app manifest — improves installability and how the site is named/shown. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Shop genuine tech`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d7fa4",
    lang: "en",
    categories: ["shopping", "electronics"],
  };
}
