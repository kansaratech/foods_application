import { Carousel } from "primereact/carousel";
// query
import { GET_BANNERS } from "@/lib/api/graphql/queries";
// gql
import { useQuery } from "@apollo/client";
// loading skeleton
import DiscoveryBannerSkeleton from "@/lib/ui/useable-components/custom-skeletons/banner.skeleton";
// Interface
import { IGetBannersResponse } from "@/lib/utils/interfaces";
// banner card
import BannerCard from "./banner-card";
import { useEffect, useState } from "react";

type Placement = "HOME" | "STORE" | "LANDING";

/**
 * Renders the campaign banners scheduled for a given storefront placement.
 * The API only returns banners whose window is currently open, so this
 * component just displays whatever it gets and renders nothing when empty.
 */
export default function DiscoveryBannerSection({
  placement = "HOME",
}: {
  placement?: Placement;
}) {
  const { data, loading, error } = useQuery<IGetBannersResponse>(GET_BANNERS, {
    variables: { placement },
    fetchPolicy: "cache-and-network",
  });

  // Check if RTL (client-side only)
  const [isRTL, setIsRTL] = useState(false);
  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  if (loading) {
    return <DiscoveryBannerSkeleton />;
  }
  if (error || !data?.banners?.length) {
    return null;
  }

  const banners = data.banners;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="mt-6 px-4 md:px-6 lg:px-12 xl:px-20 2xl:px-[80px]"
    >
      <Carousel
        className={`discovery-carousel ${isRTL ? "rtl-carousel" : ""} ${banners.length < 2 ? "low-count-carousel" : ""}`}
        value={banners}
        numVisible={banners.length < 2 ? 1 : 2}
        numScroll={1}
        circular={banners.length > 1}
        style={{ width: "100%" }}
        showNavigators={banners.length > 1}
        showIndicators={false}
        itemTemplate={(item) => <BannerCard item={item} />}
        autoplayInterval={banners.length > 1 ? 5000 : undefined}
        responsiveOptions={[
          { breakpoint: "768px", numVisible: 1, numScroll: 1 },
          { breakpoint: "1024px", numVisible: banners.length < 2 ? 1 : 2, numScroll: 1 },
        ]}
      />
    </div>
  );
}
