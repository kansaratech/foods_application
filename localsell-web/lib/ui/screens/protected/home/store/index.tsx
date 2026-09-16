"use client"

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import useGetCuisines from "@/lib/hooks/useGetCuisines";
import useServiceability from "@/lib/hooks/useServiceability";
import { useUserAddress } from "@/lib/context/address/address.context";
import GenericListingComponent from "@/lib/ui/screen-components/protected/home/GenericListingComponent";
import { AreaUnavailable } from "@/lib/ui/screen-components/protected/home";
import { useTranslations } from "next-intl";
import { NEAR_BY_RESTAURANTS_PAGINATED } from "@/lib/api/graphql/queries";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants";
import {
  INearByRestaurantsPaginatedData,
  IRestaurant,
} from "@/lib/utils/interfaces/restaurants.interface";

const PAGE_SIZE = 12;

export default function StoreScreen() {
  const t = useTranslations();

  const { userAddress } = useUserAddress();
  const {
    hasLocation,
    loading: serviceabilityLoading,
    serviceable,
    nearestArea,
    nearestDistanceKm,
  } = useServiceability();

  const rawLongitude = Number(userAddress?.location?.coordinates[0]) || 0;
  const rawLatitude = Number(userAddress?.location?.coordinates[1]) || 0;
  const hasUserLocation = rawLatitude !== 0 || rawLongitude !== 0;
  const userLatitude = hasUserLocation
    ? rawLatitude
    : MARKETPLACE_LOCATION.latitude;
  const userLongitude = hasUserLocation
    ? rawLongitude
    : MARKETPLACE_LOCATION.longitude;

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<IRestaurant[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, loading, error, fetchMore } =
    useQuery<INearByRestaurantsPaginatedData>(NEAR_BY_RESTAURANTS_PAGINATED, {
      variables: {
        latitude: userLatitude,
        longitude: userLongitude,
        shopType: "grocery",
        page: 1,
        limit: PAGE_SIZE,
      },
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    });

  // The serviceable location changed — start the list over from page 1.
  useEffect(() => {
    setPage(1);
    setItems([]);
    setHasMore(true);
  }, [userLatitude, userLongitude]);

  useEffect(() => {
    const restaurants = data?.nearByRestaurantsPreview?.restaurants;
    if (!restaurants) return;
    setItems((prev) => {
      if (page === 1) return restaurants;
      const seen = new Set(prev.map((r) => r._id));
      return [...prev, ...restaurants.filter((r) => !seen.has(r._id))];
    });
    if (restaurants.length < PAGE_SIZE) setHasMore(false);
  }, [data, page]);

  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    const result = await fetchMore({
      variables: { page: nextPage, limit: PAGE_SIZE },
    });
    const newRestaurants =
      result.data?.nearByRestaurantsPreview?.restaurants ?? [];
    if (newRestaurants.length === 0) {
      setHasMore(false);
      return;
    }
    setPage(nextPage);
  }, [fetchMore, hasMore, loading, page]);

  const { loading: cuisinesloading, groceryCuisinesData } = useGetCuisines();

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
      queryData={items}
      headingTitle={t('StoresPage.headingTitle')}
      cuisineSectionTitle={t('StoresPage.cuisineSectionTitle')}
      mainSectionTitle={t('StoresPage.mainSectionTitle')}
      mainData={items}
      cuisineDataFromHook={groceryCuisinesData}
      loading={loading}
      cuisinesloading={cuisinesloading}
      error={!!error}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
    />
  );
}
