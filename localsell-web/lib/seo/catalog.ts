import { cache } from "react";
import { pageMetadata } from "./metadata";

export type PublicStore = {
  _id: string;
  name: string;
  slug: string | null;
  shopType: string | null;
  description?: string | null;
  image?: string | null;
  city?: string | null;
  isActive: boolean;
  approvalStatus: string;
};

async function publicQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T | null> {
  const base = process.env.SEO_API_URL || process.env.NEXT_PUBLIC_SERVER_URL;
  if (!base) return null;
  const endpoint = `${base.replace(/\/+$/, "").replace(/\/graphql$/, "")}/graphql`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload.errors) return null;
    return payload.data ?? null;
  } catch {
    // Public pages must still render when catalog SEO data is unavailable.
    return null;
  }
}

export function storePath(store: PublicStore): string {
  const type = store.shopType === "restaurant" ? "restaurant" : "store";
  return `/${type}/${encodeURIComponent(store.slug || store.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}/${encodeURIComponent(store._id)}`;
}

export const getPublicStores = cache(async (): Promise<PublicStore[]> => {
  const data = await publicQuery<{
    nearByRestaurants: { restaurants: PublicStore[] };
  }>(
    `query SeoStores { nearByRestaurants { restaurants { _id name slug shopType isActive approvalStatus } } }`,
  );
  return (data?.nearByRestaurants?.restaurants ?? []).filter(
    (store) =>
      store.isActive && store.approvalStatus === "APPROVED" && store.slug,
  );
});

export const getPublicStore = cache(
  async (id: string): Promise<PublicStore | null> => {
    const data = await publicQuery<{ restaurant: PublicStore | null }>(
      `query SeoStore($id: String!) { restaurant(id: $id) { _id name slug shopType description image city isActive approvalStatus } }`,
      { id },
    );
    const store = data?.restaurant;
    return store?.isActive && store.approvalStatus === "APPROVED"
      ? store
      : null;
  },
);

export async function storeMetadata(id: string, requestedPath: string) {
  const store = await getPublicStore(id);
  if (!store)
    return pageMetadata({
      title: "Local Store",
      description: "Explore local stores and restaurants on Localsell.",
      path: requestedPath,
      index: false,
    });
  const title = `${store.name}${store.city ? ` in ${store.city}` : ""}`;
  const description =
    store.description
      ?.replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) ||
    `Browse ${store.shopType === "restaurant" ? "the menu" : "products"} at ${store.name}${store.city ? ` in ${store.city}` : ""}. Check prices and delivery availability and order through Localsell.`;
  return pageMetadata({
    title,
    description,
    path: storePath(store),
    image: store.image,
  });
}
