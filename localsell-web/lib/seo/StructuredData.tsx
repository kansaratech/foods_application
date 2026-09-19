import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "./metadata";

export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function WebsiteStructuredData() {
  return (
    <StructuredData
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: SITE_NAME,
            legalName: "Maekotech Solutions LLP",
            url: SITE_URL,
            logo: {
              "@type": "ImageObject",
              url: absoluteUrl("/assets/brand/localsell-logo.png"),
              width: 800,
              height: 222,
            },
            email: "contact@maekotech.com",
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              email: "contact@maekotech.com",
              availableLanguage: ["English", "Hindi"],
            },
            address: {
              "@type": "PostalAddress",
              addressLocality: "Deogarh",
              addressRegion: "Rajasthan",
              addressCountry: "IN",
            },
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: SITE_NAME,
            alternateName: "LocalSell",
            url: SITE_URL,
            description: SITE_DESCRIPTION,
            publisher: { "@id": `${SITE_URL}/#organization` },
            inLanguage: ["en-IN", "hi-IN"],
          },
        ],
      }}
    />
  );
}

export function PageStructuredData({
  title,
  description,
  path,
  type = "WebPage",
  modified,
}: {
  title: string;
  description: string;
  path: string;
  type?: "WebPage" | "CollectionPage";
  modified?: string;
}) {
  const url = absoluteUrl(path);
  return (
    <StructuredData
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": type,
            "@id": `${url}#webpage`,
            url,
            name: title,
            description,
            isPartOf: { "@id": `${SITE_URL}/#website` },
            ...(modified ? { dateModified: modified } : {}),
            breadcrumb: { "@id": `${url}#breadcrumb` },
          },
          {
            "@type": "BreadcrumbList",
            "@id": `${url}#breadcrumb`,
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: SITE_NAME,
                item: SITE_URL,
              },
              ...(path === "/"
                ? []
                : [
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: title,
                      item: url,
                    },
                  ]),
            ],
          },
        ],
      }}
    />
  );
}
