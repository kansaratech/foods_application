import { ShopTypeScreen } from "@/lib/ui/screens/protected/home";
import { getPublicStores } from "@/lib/seo/catalog";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stores = await getPublicStores();
  const exists = stores.some((store) => store.shopType === slug);
  const name = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 70);
  return pageMetadata({
    title: `${name} Near You`,
    description: `Browse local ${name.toLowerCase()} shops on Localsell. Explore available products and check delivery options for your address.`,
    path: `/shop-type/${encodeURIComponent(slug)}`,
    index: exists,
  });
}

export default function ShopTypePage() {
  return <ShopTypeScreen />;
}
