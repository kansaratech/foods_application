import Rider from "@/lib/ui/screens/unprotected/Rider";
import { publicPageMetadata, PUBLIC_PAGES } from "@/lib/seo/metadata";
import { PageStructuredData } from "@/lib/seo/StructuredData";

export const metadata = publicPageMetadata("/rider");

export default function Page() {
  const page = PUBLIC_PAGES.find((entry) => entry.path === "/rider")!;
  return (
    <>
      <PageStructuredData {...page} type="WebPage" />
      <Rider />
    </>
  );
}
