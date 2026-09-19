import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    // Keep pages crawlable so crawlers can read their noindex directives.
    // Robots rules are not a substitute for authentication.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
