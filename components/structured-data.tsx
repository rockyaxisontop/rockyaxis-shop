import { SITE_CONTACT, SITE_DESCRIPTION, SITE_NAME, SITE_SOCIAL, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * JSON-LD describing the store as an organisation and as a website.
 *
 * Rendered once in the root layout so every page carries it. Search engines use
 * it for the knowledge panel, the site name in results and the sitelinks search
 * box. Values are constants from `lib/site.ts` — never user input.
 */
export function SiteStructuredData({
  countryName,
  capital,
  countryCode,
}: {
  countryName: string;
  capital: string;
  countryCode: string;
}) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: "MTstore",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        email: SITE_CONTACT.email,
        telephone: SITE_CONTACT.phone,
        sameAs: [...SITE_SOCIAL],
        address: {
          "@type": "PostalAddress",
          addressLocality: capital,
          addressRegion: capital,
          addressCountry: countryCode,
        },
        areaServed: { "@type": "Country", name: countryName },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: SITE_CONTACT.phone,
          contactType: "customer support",
          email: SITE_CONTACT.email,
          areaServed: countryName,
          availableLanguage: ["en"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
