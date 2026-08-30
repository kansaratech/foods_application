// Queries
import { NEAR_BY_RESTAURANTS_PREVIEW } from "@/lib/api/graphql/queries";
// UseQuery
import { useQuery } from "@apollo/client";
// interface
import {
  INearByRestaurantsPreviewData,
  IRestaurant,
} from "../utils/interfaces/restaurants.interface";
// context
import { useUserAddress } from "../context/address/address.context";
import { MARKETPLACE_LOCATION } from "../utils/constants";

// Stable empty-array reference so `queryData` keeps a constant identity while
// data is unloaded. Returning a fresh `[]` each render churns downstream
// `useMemo`/effect dependencies and can trigger render loops under React 19.
const EMPTY_RESTAURANTS: IRestaurant[] = [];

const useNearByRestaurantsPreview = (
  enabled = true,
  page = 1,
  limit = 10,
  shopType?: string | null 
) => {
  const { userAddress } = useUserAddress();
  const rawLongitude = Number(userAddress?.location?.coordinates[0]) || 0;
  const rawLatitude = Number(userAddress?.location?.coordinates[1]) || 0;

  // When the visitor has not set a location yet, fall back to the marketplace
  // town so discovery/store are never empty.
  const hasUserLocation = rawLatitude !== 0 || rawLongitude !== 0;
  const userLatitude = hasUserLocation
    ? rawLatitude
    : MARKETPLACE_LOCATION.latitude;
  const userLongitude = hasUserLocation
    ? rawLongitude
    : MARKETPLACE_LOCATION.longitude;

  const { data, loading, error, networkStatus, fetchMore } =
    useQuery<INearByRestaurantsPreviewData>(NEAR_BY_RESTAURANTS_PREVIEW, {
      variables: {
        latitude: userLatitude,
        longitude: userLongitude,
        radiusKm: MARKETPLACE_LOCATION.radiusKm,
        shopType: shopType ?? null, // 🔑 pass down if provided
      },
      fetchPolicy: "cache-and-network",
      skip: !enabled,
      notifyOnNetworkStatusChange: true,
    });

  void page;
  void limit;

  const queryData: IRestaurant[] =
    data?.nearByRestaurants?.restaurants ?? EMPTY_RESTAURANTS;

  const groceriesData: IRestaurant[] =
    queryData?.filter(
      (item) => item?.shopType?.toLowerCase() === "grocery"
    ) ?? [];

  const restaurantsData: IRestaurant[] =
    queryData?.filter(
      (item) => item?.shopType?.toLowerCase() === "restaurant"
    ) ?? [];

  return {
    queryData,
    loading,
    error,
    networkStatus,
    groceriesData,
    restaurantsData,
    fetchMore, // expose for infinite scroll
  };
};

export default useNearByRestaurantsPreview;
