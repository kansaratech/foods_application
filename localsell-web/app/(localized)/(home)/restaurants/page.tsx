import { RestaurantsScreen } from "@/lib/ui/screens/protected/home";
import { publicPageMetadata, PUBLIC_PAGES } from "@/lib/seo/metadata";
import { PageStructuredData } from "@/lib/seo/StructuredData";

export const metadata = publicPageMetadata("/restaurants");

export default function Page() {
  const page = PUBLIC_PAGES.find((entry) => entry.path === "/restaurants")!;
  return (
    <>
      <PageStructuredData {...page} type="CollectionPage" />
      <RestaurantsScreen />
    </>
  );
}
