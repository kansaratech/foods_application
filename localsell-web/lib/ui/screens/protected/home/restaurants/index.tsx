"use client";

import { useState, useEffect, useCallback } from "react";
import useNearByRestaurantsPreview from "@/lib/hooks/useNearByRestaurantsPreview";
import useGetCuisines from "@/lib/hooks/useGetCuisines";
import useServiceability from "@/lib/hooks/useServiceability";
import { useUserAddress } from "@/lib/context/address/address.context";
import GenericListingComponent from "@/lib/ui/screen-components/protected/home/GenericListingComponent";
import { AreaUnavailable } from "@/lib/ui/screen-components/protected/home";
import { useTranslations } from "next-intl";

export default function RestaurantsScreen() {
  const t = useTranslations();
  const limit = 10;

  const { userAddress } = useUserAddress();
  const {
    hasLocation,
    loading: serviceabilityLoading,
    serviceable,
    nearestArea,
    nearestDistanceKm,
  } = useServiceability();

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { loading, error, queryData, fetchMore } = useNearByRestaurantsPreview(
    true,
    page,
    limit,
    "restaurant"
  );

  const { loading: cuisinesloading, restaurantCuisinesData } = useGetCuisines();

  // ✅ Initial load
  useEffect(() => {
    if (page === 1 && queryData?.length) {
      setItems(queryData);
    }
  }, [queryData, page]);

  // ✅ Load more
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      const res = await fetchMore({
        variables: { page: page + 1, limit, shopType: "restaurant" },
      });

      const newItems = res.data?.nearByRestaurants?.restaurants ?? [];

      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems]);
        setPage((p) => p + 1);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("❌ Error fetching more:", err);
    }
  }, [page, hasMore, fetchMore, loading]);

  // ✅ Scroll listener (your tested one)
  useEffect(() => {
    if (!fetchMore || !hasMore) return;

    const handleScroll = () => {
      const scrollTop = document.body.scrollTop;
      const clientHeight = document.body.clientHeight;
      const scrollHeight = document.body.scrollHeight;
 
      const bottom = scrollTop + clientHeight >= scrollHeight - 300;

      if (bottom && !loading) {
       
        loadMore();
      }
    };

    document.body.addEventListener("scroll", handleScroll);
    return () => document.body.removeEventListener("scroll", handleScroll);
  }, [fetchMore, hasMore, loading, loadMore]);

  // The visitor picked a location no active store delivers to — show the
  // "not available yet" screen instead of an empty "No item found" list.
  if (hasLocation && !serviceabilityLoading && serviceable === false) {
    return (
      <AreaUnavailable
        areaLabel={userAddress?.deliveryAddress}
        nearestArea={nearestArea}
        nearestDistanceKm={nearestDistanceKm}
      />
    );
  }

  return (
    <GenericListingComponent
    queryData= {queryData}
      headingTitle={t("RestaurantPage.headingTitle")}
      cuisineSectionTitle={t("RestaurantPage.cuisineSectionTitle")}
      mainSectionTitle={t("RestaurantPage.mainSectionTitle")}
      mainData={items} // ✅ pass paginated items
      cuisineDataFromHook={restaurantCuisinesData}
      loading={loading}
      cuisinesloading={cuisinesloading}
      error={!!error}
      hasMore={hasMore} // ✅ pass down so MainSection can show "No more"
    />
  );
}
