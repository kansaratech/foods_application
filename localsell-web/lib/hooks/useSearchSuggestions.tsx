"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";

import { SEARCH_SUGGESTIONS } from "@/lib/api/graphql/queries";
import {
  IFoodSearchResult,
  IRestaurant,
  ISearchSuggestionsData,
} from "@/lib/utils/interfaces/restaurants.interface";
import { useUserAddress } from "@/lib/context/address/address.context";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants";

const EMPTY_RESTAURANTS: IRestaurant[] = [];
const EMPTY_FOODS: IFoodSearchResult[] = [];

/**
 * Live "type-ahead" suggestions for the header search box — debounced calls
 * to `searchSuggestions`, matching both store/restaurant names and food items,
 * scoped to the visitor's delivery location the same way the rest of
 * discovery is (see useNearByRestaurantsPreview).
 */
export default function useSearchSuggestions() {
  const { userAddress } = useUserAddress();
  const rawLongitude = Number(userAddress?.location?.coordinates[0]) || 0;
  const rawLatitude = Number(userAddress?.location?.coordinates[1]) || 0;
  const hasUserLocation = rawLatitude !== 0 || rawLongitude !== 0;
  const latitude = hasUserLocation ? rawLatitude : MARKETPLACE_LOCATION.latitude;
  const longitude = hasUserLocation ? rawLongitude : MARKETPLACE_LOCATION.longitude;

  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [runQuery, { data, loading }] = useLazyQuery<ISearchSuggestionsData>(
    SEARCH_SUGGESTIONS,
    { fetchPolicy: "network-only" },
  );

  const search = useCallback(
    (value: string) => {
      setTerm(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const keyword = value.trim();
      if (keyword.length < 2) {
        setOpen(false);
        return;
      }

      setOpen(true);
      debounceRef.current = setTimeout(() => {
        void runQuery({
          variables: {
            keyword,
            latitude,
            longitude,
            radiusKm: MARKETPLACE_LOCATION.radiusKm,
            limit: 6,
          },
        });
      }, 300);
    },
    [runQuery, latitude, longitude],
  );

  const close = useCallback(() => setOpen(false), []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return {
    term,
    open,
    loading,
    restaurants: data?.searchSuggestions?.restaurants ?? EMPTY_RESTAURANTS,
    foods: data?.searchSuggestions?.foods ?? EMPTY_FOODS,
    search,
    close,
  };
}
