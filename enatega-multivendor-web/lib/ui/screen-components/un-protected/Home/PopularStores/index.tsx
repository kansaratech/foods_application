"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";

import { POPULAR_RESTAURANTS_PREVIEW } from "@/lib/api/graphql/queries/restaurants";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants";
import { useUserAddress } from "@/lib/context/address/address.context";

interface IPopularStore {
  _id: string;
  name: string;
  slug?: string | null;
  image?: string | null;
  logo?: string | null;
  shopType?: string | null;
  deliveryTime?: number | null;
  minimumOrder?: number | null;
  cuisines?: string[] | null;
  reviewAverage?: number | null;
  reviewCount?: number | null;
}

const placeholderHint = (name: string, shopType?: string | null) => {
  if (shopType === "grocery") return "produce shelf";
  const n = name.toLowerCase();
  if (n.includes("sweet") || n.includes("mithai") || n.includes("khaman"))
    return "mithai counter";
  if (n.includes("biryani")) return "biryani handi";
  if (n.includes("chai") || n.includes("tea") || n.includes("cafe"))
    return "kettle and cups";
  if (n.includes("bowl") || n.includes("green") || n.includes("salad"))
    return "protein bowl";
  if (n.includes("pizza")) return "wood-fired oven";
  if (n.includes("thali") || n.includes("rasoi")) return "thali plate";
  return "kitchen counter";
};

const StoreCard = ({
  store,
  currency,
}: {
  store: IPopularStore;
  currency: string;
}) => {
  const isGrocery = store.shopType === "grocery";
  const href = store.slug
    ? `/${isGrocery ? "store" : "restaurant"}/${store.slug}/${store._id}`
    : "/discovery";

  const cuisineLine = (store.cuisines ?? []).slice(0, 2).join(" · ");
  const costLine =
    store.minimumOrder && store.minimumOrder > 0
      ? `${currency}${Math.round(store.minimumOrder)} for one`
      : "—";
  const rating =
    typeof store.reviewAverage === "number" && store.reviewAverage > 0
      ? store.reviewAverage.toFixed(1)
      : null;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-[#f5820a]/50 hover:shadow-[0_18px_45px_rgba(140,29,64,0.10)] dark:border-gray-800 dark:bg-gray-900"
    >
      <div
        className="relative flex h-40 items-center justify-center overflow-hidden border-b border-slate-100 text-[11px] font-medium tracking-wide text-[#8c1d40]/45 dark:border-gray-800"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #f6ece3 0 12px, #efe1d5 12px 24px)",
        }}
      >
        {store.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.image}
            alt={store.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          placeholderHint(store.name, store.shopType)
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold leading-tight text-slate-950 dark:text-white">
            {store.name}
          </h3>
          {rating && (
            <span className="shrink-0 rounded-md bg-[#e6f4ef] px-1.5 py-0.5 text-xs font-bold text-[#1b7a5a]">
              {rating}
            </span>
          )}
        </div>
        {cuisineLine && (
          <p className="text-sm text-slate-500 dark:text-gray-400">
            {cuisineLine}
          </p>
        )}
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          {store.deliveryTime ?? 30} min · {costLine}
        </p>
      </div>
    </Link>
  );
};

const SkeletonCard = () => (
  <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div className="aspect-[4/3] animate-pulse bg-slate-100 dark:bg-gray-800" />
    <div className="flex flex-col gap-2 p-4">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-gray-800" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-gray-800" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-gray-800" />
    </div>
  </div>
);

export default function PopularStores() {
  const { CURRENCY_SYMBOL } = useConfig();
  const { userAddress } = useUserAddress();
  const userLongitude = Number(userAddress?.location?.coordinates[0]);
  const userLatitude = Number(userAddress?.location?.coordinates[1]);
  const hasUserLocation = Number.isFinite(userLatitude) && Number.isFinite(userLongitude);
  const currency =
    !CURRENCY_SYMBOL || CURRENCY_SYMBOL === "Rs" || CURRENCY_SYMBOL === "INR"
      ? "₹"
      : CURRENCY_SYMBOL;

  const { data, loading } = useQuery(POPULAR_RESTAURANTS_PREVIEW, {
    variables: {
      latitude: hasUserLocation ? userLatitude : MARKETPLACE_LOCATION.latitude,
      longitude: hasUserLocation ? userLongitude : MARKETPLACE_LOCATION.longitude,
      radiusKm: MARKETPLACE_LOCATION.radiusKm,
      limit: 8,
    },
    fetchPolicy: "cache-and-network",
  });

  const stores: IPopularStore[] = data?.popularRestaurantsPreview ?? [];
  const totalCount: number | undefined = data?.activeRestaurantCount;

  if (!loading && stores.length === 0) return null;

  return (
    <section className="w-full px-4 py-16 md:px-6 lg:px-12 lg:py-20 xl:px-20 2xl:px-[80px]">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-[34px]">
          {hasUserLocation ? "Popular near you" : `Popular in ${MARKETPLACE_LOCATION.city}`}
        </h2>
        <Link
          href="/discovery"
          className="text-sm font-bold text-[#8c1d40] transition hover:text-[#f5820a] dark:text-orange-300"
        >
          {totalCount
            ? `Browse all ${totalCount} stores →`
            : "Browse all stores →"}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loading && stores.length === 0
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : stores.map((store) => (
              <StoreCard key={store._id} store={store} currency={currency} />
            ))}
      </div>
    </section>
  );
}
