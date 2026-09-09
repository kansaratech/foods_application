"use client";

import useNearByRestaurantsPreview from "@/lib/hooks/useNearByRestaurantsPreview";
import useGetCuisines from "@/lib/hooks/useGetCuisines";
import useServiceability from "@/lib/hooks/useServiceability";
import { useUserAddress } from "@/lib/context/address/address.context";
import GenericListingComponent from "@/lib/ui/screen-components/protected/home/GenericListingComponent";
import { AreaUnavailable } from "@/lib/ui/screen-components/protected/home";
import { useTranslations } from "next-intl";

export default function RestaurantsScreen() {
  const t = useTranslations();

  const { userAddress } = useUserAddress();
  const {
    hasLocation,
    loading: serviceabilityLoading,
    serviceable,
    nearestArea,
    nearestDistanceKm,
  } = useServiceability();

  // `nearByRestaurants` returns the full serviceable list in one response — it
  // takes no page/limit. The old fetchMore loop just re-requested the same list
  // forever, appending duplicates (QA #57). Render what the query gives us.
  const { loading, error, queryData } = useNearByRestaurantsPreview(
    true,
    1,
    0,
    "restaurant",
  );

  const { loading: cuisinesloading, restaurantCuisinesData } = useGetCuisines();

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
      queryData={queryData}
      headingTitle={t("RestaurantPage.headingTitle")}
      cuisineSectionTitle={t("RestaurantPage.cuisineSectionTitle")}
      mainSectionTitle={t("RestaurantPage.mainSectionTitle")}
      mainData={queryData}
      cuisineDataFromHook={restaurantCuisinesData}
      loading={loading}
      cuisinesloading={cuisinesloading}
      error={!!error}
      hasMore={false}
    />
  );
}
