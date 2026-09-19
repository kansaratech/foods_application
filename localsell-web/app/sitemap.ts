import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, absoluteUrl } from "@/lib/seo/metadata";
import { getPublicStores, storePath } from "@/lib/seo/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stores = await getPublicStores();
  const types = stores.flatMap((store) =>
    store.shopType ? [`/shop-type/${encodeURIComponent(store.shopType)}`] : [],
  );
  const paths = new Set([
    ...PUBLIC_PAGES.map((page) => page.path),
    ...stores.map(storePath),
    ...types,
  ]);
  // No invented modification dates: only set lastModified when sourced from
  // a real content revision. Exclude accounts, search results and aliases.
  return [...paths].map((path) => ({ url: absoluteUrl(path) }));
}
