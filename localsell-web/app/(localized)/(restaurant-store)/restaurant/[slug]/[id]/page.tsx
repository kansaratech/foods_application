import RestaurantDetailsScreen from "@/lib/ui/screens/protected/resturant-store/restaurant";
import { getPublicStore, storeMetadata, storePath } from "@/lib/seo/catalog";
import { PageStructuredData } from "@/lib/seo/StructuredData";

type Props = { params: Promise<{ id: string; slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { id, slug } = await params;
  return storeMetadata(
    id,
    `/restaurant/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`,
  );
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  const store = await getPublicStore(id);
  return (
    <>
      {store && (
        <PageStructuredData
          title={store.name}
          description={
            store.description || `Browse ${store.name} on Localsell.`
          }
          path={storePath(store)}
        />
      )}
      <RestaurantDetailsScreen />
    </>
  );
}
