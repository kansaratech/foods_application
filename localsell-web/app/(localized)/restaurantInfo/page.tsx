import RestInfo from "@/lib/ui/screens/unprotected/RestaurantInfo";
import { publicPageMetadata, PUBLIC_PAGES } from "@/lib/seo/metadata";
import { PageStructuredData } from "@/lib/seo/StructuredData";

export const metadata = publicPageMetadata("/restaurantInfo");

export default function Page() {
  const page = PUBLIC_PAGES.find((entry) => entry.path === "/restaurantInfo")!;
  return (
    <>
      <PageStructuredData {...page} type="WebPage" />
      <RestInfo />
    </>
  );
}
