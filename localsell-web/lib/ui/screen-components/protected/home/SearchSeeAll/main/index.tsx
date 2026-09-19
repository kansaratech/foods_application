// core
import React, { useCallback, useMemo, useState } from "react";
// card component
import Card from "@/lib/ui/useable-components/card";
import BrandLoader from "@/lib/ui/useable-components/brand-loader";
import Image from "@/lib/ui/useable-components/safe-image";
// hooks
import { useQuery } from "@apollo/client";
import { SEARCH_SUGGESTIONS } from "@/lib/api/graphql/queries";
import { useUserAddress } from "@/lib/context/address/address.context";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants";
import { ISearchSuggestionsData } from "@/lib/utils/interfaces/restaurants.interface";
// useParams
import { useParams, useRouter } from "next/navigation";
// heading component
import HomeHeadingSection from "@/lib/ui/useable-components/home-heading-section";
import BackButton from "@/lib/ui/useable-components/back-button";
import { useTranslations } from "next-intl";

function SearchSeeAllSection() {
  // State to handle modal open
  const [isModalOpen, setIsModalOpen] = useState({ value: false, id: "" });

  // Handle update is modal open
  const handleUpdateIsModalOpen = useCallback((value: boolean, id: string) => {
    setIsModalOpen((current) =>
      current.value !== value || current.id !== id ? { value, id } : current,
    );
  }, []);

  // Get slug from URL params — the search term the header submitted.
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const rawSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const term = rawSlug ? decodeURIComponent(rawSlug).trim() : "";

  const title = term.replace(/^./, (str) => str.toUpperCase());

  const { userAddress } = useUserAddress();
  const rawLongitude = Number(userAddress?.location?.coordinates[0]) || 0;
  const rawLatitude = Number(userAddress?.location?.coordinates[1]) || 0;
  const hasUserLocation = rawLatitude !== 0 || rawLongitude !== 0;
  const latitude = hasUserLocation
    ? rawLatitude
    : MARKETPLACE_LOCATION.latitude;
  const longitude = hasUserLocation
    ? rawLongitude
    : MARKETPLACE_LOCATION.longitude;

  // Server-side match against both store/restaurant names and food items
  // (same `searchSuggestions` query the header's live dropdown uses, just a
  // wider limit for a full results page).
  const { data, loading } = useQuery<ISearchSuggestionsData>(
    SEARCH_SUGGESTIONS,
    {
      variables: {
        keyword: term,
        latitude,
        longitude,
        radiusKm: MARKETPLACE_LOCATION.radiusKm,
        limit: 48,
      },
      skip: !term,
      fetchPolicy: "cache-and-network",
    },
  );

  const restaurants = useMemo(
    () => data?.searchSuggestions?.restaurants ?? [],
    [data],
  );
  const foods = useMemo(() => data?.searchSuggestions?.foods ?? [], [data]);

  const goToRestaurant = (
    restaurantId: string,
    restaurantSlug?: string | null,
    shopType?: string | null,
  ) => {
    // Same rule as every other navigator (BannerCard, pickRestaurant, Card):
    // only an exact "restaurant" shopType goes to /restaurant/, everything
    // else (grocery, and any future shop type) goes to /store/. Previously
    // inverted (shopType === "grocery" ? store : restaurant) — equivalent
    // today since those are the only two shop types, but would silently
    // break for a third one.
    router.push(
      `/${shopType === "restaurant" ? "restaurant" : "store"}/${restaurantSlug}/${restaurantId}`,
    );
  };

  if (loading && !restaurants.length && !foods.length) {
    return (
      <BrandLoader variant="page"
        label={t.has("loading_label") ? t("loading_label") : "Loading..."}
      />
    );
  }

  if (!restaurants.length && !foods.length)
    return (
      <div className="py-16 text-center">
        <BackButton fallbackHref="/discovery" className="mx-auto mb-6 w-fit" />
        <p className="text-2xl font-bold">No results for “{term}”</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Try a different name, cuisine or dish.
        </p>
      </div>
    );

  return (
    <>
      <BackButton fallbackHref="/discovery" className="mx-[6px] mb-4" />
      {restaurants.length > 0 && (
        <>
          <HomeHeadingSection
            title={`${t("restaurant_and_stores_title")}: ` + title}
            showFilter={false}
          />
          <div className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-4 items-center">
              {restaurants.map((item) => (
                <Card
                  key={item._id}
                  item={item}
                  isModalOpen={isModalOpen}
                  handleUpdateIsModalOpen={handleUpdateIsModalOpen}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {foods.length > 0 && (
        <div className="mb-20">
          <HomeHeadingSection
            title={`Dishes & items: ${title}`}
            showFilter={false}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {foods.map((food) => (
              <button
                key={food._id}
                type="button"
                onClick={() =>
                  goToRestaurant(
                    food.restaurantId,
                    food.restaurantSlug,
                    food.restaurantShopType,
                  )
                }
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1c5bc7]/40 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-gray-700">
                  {food.image && (
                    <Image
                      src={food.image}
                      alt={food.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900 dark:text-white">
                    {food.title}
                  </span>
                  <span className="block truncate text-sm text-slate-500 dark:text-gray-400">
                    at {food.restaurantName}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default SearchSeeAllSection;
