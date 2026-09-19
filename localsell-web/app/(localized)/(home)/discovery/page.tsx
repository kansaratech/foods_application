import { DiscoveryScreen } from "@/lib/ui/screens/protected/home";
import { publicPageMetadata, PUBLIC_PAGES } from "@/lib/seo/metadata";
import { PageStructuredData } from "@/lib/seo/StructuredData";

export const metadata = publicPageMetadata("/discovery");

export default function Page() {
  const page = PUBLIC_PAGES.find((entry) => entry.path === "/discovery")!;
  return (
    <>
      <PageStructuredData {...page} type="CollectionPage" />
      <DiscoveryScreen />
    </>
  );
}
