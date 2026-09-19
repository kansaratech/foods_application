import type { Metadata } from "next";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants/marketplace";

export const SITE_URL = "https://localsell.in";
export const SITE_NAME = "Localsell";
export const SITE_DESCRIPTION = `Order food, groceries and everyday essentials from local restaurants and stores in ${MARKETPLACE_LOCATION.city}, Rajasthan. Explore nearby shops with Localsell.`;
export const SOCIAL_IMAGE = `${SITE_URL}/social-image`;
export const PRIVATE_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
} as const;

export function absoluteUrl(path: string): string {
  // Internal routes only; do not let a slug override the canonical domain.
  if (path === "/" || path === "") return SITE_URL;
  return `${SITE_URL}/${path.replace(/^\/+/, "")}`;
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  index?: boolean;
}): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  let preview = SOCIAL_IMAGE;
  if (image?.startsWith("/") && !image.startsWith("//"))
    preview = absoluteUrl(image);
  else if (image?.startsWith("https://")) {
    try {
      preview = new URL(image).href;
    } catch {
      /* Use the brand image. */
    }
  }
  return {
    title: fullTitle,
    description,
    alternates: { canonical: absoluteUrl(path) },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : PRIVATE_ROBOTS,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: absoluteUrl(path),
      locale: "en_IN",
      images: [
        {
          url: preview,
          alt: title,
          ...(preview === SOCIAL_IMAGE ? { width: 1200, height: 630 } : {}),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [{ url: preview, alt: title }],
    },
  };
}

export const PUBLIC_PAGES = [
  {
    path: "/",
    title: `Food & Grocery Delivery in ${MARKETPLACE_LOCATION.city}`,
    description: SITE_DESCRIPTION,
  },
  {
    path: "/discovery",
    title: `Explore Local Shops in ${MARKETPLACE_LOCATION.city}`,
    description: `Discover restaurants, grocery stores and everyday essentials in ${MARKETPLACE_LOCATION.city}. Browse local shops and order through Localsell.`,
  },
  {
    path: "/restaurants",
    title: `Restaurants & Food Delivery in ${MARKETPLACE_LOCATION.city}`,
    description: `Explore local restaurants in ${MARKETPLACE_LOCATION.city}, browse menus and order your favourite meals. Check availability for your delivery address on Localsell.`,
  },
  {
    path: "/store",
    title: `Groceries & Local Stores in ${MARKETPLACE_LOCATION.city}`,
    description: `Shop groceries and daily essentials from local stores in ${MARKETPLACE_LOCATION.city}. Browse products and check delivery availability on Localsell.`,
  },
  {
    path: "/rider",
    title: "Become a Delivery Partner",
    description: `Apply to become a Localsell delivery partner in ${MARKETPLACE_LOCATION.city}. Learn about the rider opportunity and submit your interest.`,
  },
  {
    path: "/restaurantInfo",
    title: "List Your Restaurant or Store",
    description: `Bring your local business online with Localsell. Apply to list your restaurant or store and reach customers in ${MARKETPLACE_LOCATION.city}.`,
  },
  {
    path: "/privacy",
    title: "Privacy Policy",
    description:
      "Learn how Localsell handles account, order, location and WhatsApp information, your privacy choices, and how to contact us or request deletion.",
  },
  {
    path: "/terms",
    title: "Terms & Conditions",
    description:
      "Read Localsell terms for orders, payments, delivery, cancellations, refunds and WhatsApp communications, including customer support and your rights.",
  },
] as const;

export function publicPageMetadata(path: string): Metadata {
  const page = PUBLIC_PAGES.find((entry) => entry.path === path);
  if (!page) throw new Error(`Missing SEO content for ${path}`);
  return pageMetadata(page);
}
