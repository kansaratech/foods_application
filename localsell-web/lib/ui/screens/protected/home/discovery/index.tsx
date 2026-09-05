"use client";
import {
  DiscoveryBannerSection,
  RestaurantsNearYou,
  MostOrderedRestaurants,
  GroceryList,
  TopGroceryPicks,
  TopRatedVendors,
  PopularRestaurants,
  PopularStores,
  OrderItAgain,
  AreaUnavailable,
} from "@/lib/ui/screen-components/protected/home";
// ui componnet
import CuisinesSection from "@/lib/ui/useable-components/cuisines-section";
// hooks
import useGetCuisines from "@/lib/hooks/useGetCuisines";
import useNearByRestaurantsPreview from "@/lib/hooks/useNearByRestaurantsPreview";
import useMostOrderedRestaurants from "@/lib/hooks/useMostOrderedRestaurants";
import useServiceability from "@/lib/hooks/useServiceability";
import { useUserAddress } from "@/lib/context/address/address.context";
import ShopTypes from "@/lib/ui/screen-components/protected/home/discovery/shop-types";

export default function DiscoveryScreen() {
  const { restaurantCuisinesData, groceryCuisinesData, queryData:cuisinesQueryData, error, loading } =
    useGetCuisines();

  // Single fetch for ALL most-ordered sections (most-ordered, popular
  // restaurants, popular stores, top grocery picks). Previously each of those
  // sections called useMostOrderedRestaurants with a different limit/shopType,
  // firing 4 separate network requests per Discovery load. We now fetch once
  // (no shopType, larger limit) and split client-side.
  const {
    queryData,
    restaurantsData: mostOrderedRestaurants,
    groceriesData: mostOrderedGroceries,
    loading: mostOrderedLoading,
    error: mostorderedError,
  } = useMostOrderedRestaurants(true, 1, 15);

  const {
    loading: restaurantsLoading,
    queryData: restaurantsNearYou,
    restaurantsData,
    groceriesData,
    error: restaurantsError,
  } = useNearByRestaurantsPreview(true, 1, 6);

  const { userAddress } = useUserAddress();
  const {
    hasLocation,
    loading: serviceabilityLoading,
    serviceable,
    nearestArea,
    nearestDistanceKm,
  } = useServiceability();

  // The visitor picked a delivery location and no active store covers it — be
  // honest about it and capture their interest instead of showing an empty page.
  if (hasLocation && !serviceabilityLoading && serviceable === false) {
    return (
      <AreaUnavailable
        areaLabel={userAddress?.deliveryAddress}
        nearestArea={nearestArea}
        nearestDistanceKm={nearestDistanceKm}
      />
    );
  }

  // Show loader/skeleton while fetching
  // if (loading && restaurantsLoading) {
  //   return (
  //     <>
  //       <DiscoveryBannerSection />
  //       <OrderItAgain />
  //       <ShopTypes />
  //       <MostOrderedRestaurants
  //         data={queryData}
  //         loading={mostOrderedLoading}
  //         error={!!mostorderedError}
  //       />
  //       <CuisinesSection
  //         title="Restaurant-cuisines"
  //         data={restaurantCuisinesData}
  //         loading={loading || restaurantsLoading}
  //         error={!!error}
  //       />
  //       <RestaurantsNearYou
  //         data={restaurantsNearYou}
  //         loading={restaurantsLoading}
  //         error={!!restaurantsError}
  //       />
  //       <CuisinesSection
  //         title="Grocery-cuisines"
  //         data={groceryCuisinesData}
  //         loading={loading || restaurantsLoading}
  //         error={!!error}
  //       />
  //       <GroceryList
  //         data={groceriesData}
  //         loading={restaurantsLoading}
  //         error={!!restaurantsError}
  //       />
  //       <TopGroceryPicks
  //       // // data={MostOrderedRestaurantsGroceryData}
  //       // loading={mostOrderedLoading}
  //       // error={!!mostorderedError}
  //       />
  //       <TopRatedVendors />
  //       <PopularRestaurants />
  //       <PopularStores />
  //     </>
  //   );
  // }

  // // Show ComingSoon only after loading is complete and data is confirmed empty
  if (
    restaurantsData.length === 0 &&
    groceriesData.length === 0 &&
    restaurantsNearYou.length === 0 &&
    queryData.length === 0 &&
    cuisinesQueryData?.length === 0 &&
    !loading &&
    !restaurantsLoading
  ) {
    return (
      <AreaUnavailable
        areaLabel={userAddress?.deliveryAddress}
        nearestArea={nearestArea}
        nearestDistanceKm={nearestDistanceKm}
      />
    );
  }

  return (
    <>
      <DiscoveryBannerSection />
      <OrderItAgain />
      <ShopTypes />
      <MostOrderedRestaurants
        data={queryData}
        loading={mostOrderedLoading}
        error={!!mostorderedError}
      />
      <CuisinesSection
        title="Restaurant-cuisines"
        data={restaurantCuisinesData}
        loading={loading}
        error={!!error}
      />
      <RestaurantsNearYou
        data={restaurantsNearYou}
        loading={restaurantsLoading}
        error={!!restaurantsError}
      />
      <CuisinesSection
        title="Grocery-cuisines"
        data={groceryCuisinesData}
        loading={loading}
        error={!!error}
      />
      <GroceryList
        data={groceriesData}
        loading={restaurantsLoading}
        error={!!restaurantsError}
      />
      <TopGroceryPicks
        data={mostOrderedGroceries}
        loading={mostOrderedLoading}
        error={!!mostorderedError}
      />
      <TopRatedVendors />
      <PopularRestaurants
        data={mostOrderedRestaurants}
        loading={mostOrderedLoading}
        error={!!mostorderedError}
      />
      <PopularStores
        data={mostOrderedGroceries}
        loading={mostOrderedLoading}
        error={!!mostorderedError}
      />
    </>
  );
}
