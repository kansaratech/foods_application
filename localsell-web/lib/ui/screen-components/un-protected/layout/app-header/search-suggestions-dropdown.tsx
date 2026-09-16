"use client";

import BrandLoader from "@/lib/ui/useable-components/brand-loader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faStore,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

import Image from "@/lib/ui/useable-components/safe-image";
import {
  IFoodSearchResult,
  IRestaurant,
} from "@/lib/utils/interfaces/restaurants.interface";

const ORANGE = "#1c5bc7";

/**
 * Live suggestions dropdown for the header search box — matched stores/
 * restaurants and matched food items, each clickable straight to that
 * store's page. Mirrors LocationPopover's panel styling.
 */
export default function SearchSuggestionsDropdown({
  term,
  loading,
  restaurants,
  foods,
  onPickRestaurant,
  onPickFood,
  onSeeAll,
}: {
  term: string;
  loading: boolean;
  restaurants: IRestaurant[];
  foods: IFoodSearchResult[];
  onPickRestaurant: (restaurant: IRestaurant) => void;
  onPickFood: (food: IFoodSearchResult) => void;
  onSeeAll: () => void;
}) {
  const hasResults = restaurants.length > 0 || foods.length > 0;

  return (
    <div
      role="listbox"
      aria-label="Search suggestions"
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:border-gray-700 dark:bg-gray-900"
    >
      {loading && !hasResults && (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500 dark:text-gray-400">
          <BrandLoader variant="inline" size={20} />
          Searching…
        </div>
      )}

      {!loading && !hasResults && (
        <p className="px-3 py-3 text-sm text-slate-400">
          No matches for “{term}” — try a different name or dish.
        </p>
      )}

      {restaurants.length > 0 && (
        <div className="mb-1">
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Stores & restaurants
          </p>
          <ul>
            {restaurants.map((restaurant) => (
              <li key={restaurant._id}>
                <button
                  type="button"
                  onClick={() => onPickRestaurant(restaurant)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-blue-50 dark:hover:bg-gray-800"
                >
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                    {restaurant.image ? (
                      <Image
                        src={restaurant.image}
                        alt={restaurant.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <FontAwesomeIcon
                        icon={faStore}
                        style={{ width: 14, height: 14, color: ORANGE }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-gray-100">
                      {restaurant.name}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {restaurant.cuisines?.join(" • ") ||
                        (restaurant.shopType === "grocery"
                          ? "Grocery"
                          : "Restaurant")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {foods.length > 0 && (
        <div>
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Dishes & items
          </p>
          <ul>
            {foods.map((food) => (
              <li key={food._id}>
                <button
                  type="button"
                  onClick={() => onPickFood(food)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-blue-50 dark:hover:bg-gray-800"
                >
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                    {food.image ? (
                      <Image
                        src={food.image}
                        alt={food.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <FontAwesomeIcon
                        icon={faUtensils}
                        style={{ width: 14, height: 14, color: ORANGE }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-gray-100">
                      {food.title}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      at {food.restaurantName}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {term.trim().length >= 2 && (
        <button
          type="button"
          onClick={onSeeAll}
          className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-[#16293f] transition hover:bg-slate-50 dark:border-gray-800 dark:text-blue-300 dark:hover:bg-gray-800"
        >
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            style={{ width: 12, height: 12 }}
          />
          See all results for “{term}”
        </button>
      )}
    </div>
  );
}
