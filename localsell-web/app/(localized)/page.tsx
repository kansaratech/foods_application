import HomeScreen from "@/lib/ui/screens/unprotected";
import { publicPageMetadata, PUBLIC_PAGES } from "@/lib/seo/metadata";
import {
  PageStructuredData,
  WebsiteStructuredData,
} from "@/lib/seo/StructuredData";

export const metadata = publicPageMetadata("/");

export default function Page() {
  const page = PUBLIC_PAGES.find((entry) => entry.path === "/")!;
  return (
    <>
      <WebsiteStructuredData />
      <PageStructuredData {...page} type="WebPage" />
      <HomeScreen />
    </>
  );
}
