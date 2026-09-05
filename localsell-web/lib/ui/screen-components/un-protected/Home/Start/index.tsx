"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client";

import useLocation from "@/lib/hooks/useLocation";
import useSetUserCurrentLocation from "@/lib/hooks/useSetUserCurrentLocation";
import { ACTIVE_RESTAURANT_COUNT } from "@/lib/api/graphql/queries/restaurants";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants";
import { useUserAddress } from "@/lib/context/address/address.context";

const TABS = [
  { label: "Food", href: "/discovery" },
  { label: "Groceries", href: "/store" },
  { label: "Essentials", href: "/store" },
  { label: "Sweets", href: "/discovery" },
];

export default function Start() {
  const router = useRouter();
  const [area, setArea] = useState("");
  const { getCurrentLocation } = useLocation();
  const { onSetUserLocation } = useSetUserCurrentLocation();
  const { userAddress } = useUserAddress();
  const hasRequestedLocation = useRef(false);
  const userLongitude = Number(userAddress?.location?.coordinates[0]);
  const userLatitude = Number(userAddress?.location?.coordinates[1]);
  const hasUserLocation = Number.isFinite(userLatitude) && Number.isFinite(userLongitude);

  const { data } = useQuery(ACTIVE_RESTAURANT_COUNT, {
    variables: {
      latitude: hasUserLocation ? userLatitude : MARKETPLACE_LOCATION.latitude,
      longitude: hasUserLocation ? userLongitude : MARKETPLACE_LOCATION.longitude,
      radiusKm: MARKETPLACE_LOCATION.radiusKm,
    },
    fetchPolicy: "cache-and-network",
  });
  const storeCount: number | undefined = data?.activeRestaurantCount;

  useEffect(() => {
    if (hasRequestedLocation.current) return;
    hasRequestedLocation.current = true;
    getCurrentLocation(onSetUserLocation);
  }, [getCurrentLocation, onSetUserLocation]);

  const useCurrentLocation = () => {
    getCurrentLocation(onSetUserLocation);
    router.push("/discovery");
  };

  const showStores = () => router.push("/discovery");

  return (
    <section className="overflow-hidden bg-white dark:bg-gray-900">
      <div className="grid w-full items-center gap-8 px-4 py-10 sm:py-12 md:px-6 lg:min-h-[620px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-12 lg:py-12 xl:px-20 2xl:px-[80px]">
        {/* Left */}
        <div className="relative z-10">
          <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-xs sm:tracking-[0.3em]">
            One app. Everyday possibilities.
          </p>
          <h1 className="text-[34px] font-black leading-[1.05] tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl sm:leading-[1.03] lg:text-[58px]">
            Everything you need,
            <span className="mt-2 block font-serif text-[34px] font-normal italic leading-none tracking-[-0.03em] text-[#16293f] dark:text-blue-300 sm:text-[52px] lg:text-[60px]">
              beautifully delivered.
            </span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-slate-700 dark:text-gray-200 sm:text-lg">
            Food, groceries and everyday essentials from{" "}
            {storeCount ? storeCount.toLocaleString("en-IN") : "local"}{" "}
            {MARKETPLACE_LOCATION.city} stores, brought together in one simple
            experience.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              showStores();
            }}
            className="mt-8 flex max-w-[640px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_45px_rgba(22,41,63,0.09)] dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center"
          >
            <div className="flex flex-1 items-center gap-3 px-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#1c5bc7]" />
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Search for an area or society…"
                className="w-full bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={useCurrentLocation}
              className="shrink-0 px-2 text-sm font-bold text-[#16293f] transition hover:text-[#1c5bc7] dark:text-blue-300"
            >
              Current location
            </button>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-[#1c5bc7] px-5 py-3 text-sm font-bold text-white transition hover:brightness-95"
            >
              Browse stores <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 border-b border-slate-200 pb-1 text-sm font-bold dark:border-gray-700">
            {TABS.map((tab, i) => (
              <Link
                key={tab.label}
                href={tab.href}
                aria-current={i === 0 ? "page" : undefined}
                className={`-mb-px border-b-[3px] px-1 pb-3 transition ${
                  i === 0
                    ? "border-[#16293f] text-[#16293f] dark:border-blue-300 dark:text-blue-300"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right — orbit */}
        <div className="relative mx-auto aspect-square w-full max-w-[380px] sm:max-w-[460px] lg:max-w-[560px]">
          <div className="hero-orbit hero-orbit-primary" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-secondary" aria-hidden="true" />
          <Image
            src="/assets/images/hero/localsell-delivery-collage.png"
            alt="Food, groceries and everyday essentials delivered by LocalSell"
            fill
            priority
            className="hero-collage relative z-10 object-contain p-3 sm:p-5"
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 460px, 560px"
          />
          <span className="absolute right-[8%] top-[2%] z-20 px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-slate-500 sm:px-3 sm:text-[11px]">
            <b className="text-[#1c5bc7]">01</b> EAT
          </span>
          <span className="absolute bottom-[6%] right-[1%] z-20 px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-slate-500 sm:px-3 sm:text-[11px]">
            <b className="text-[#1c5bc7]">02</b> SHOP
          </span>
          <span className="absolute left-[1%] top-[43%] z-20 px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-slate-500 sm:px-3 sm:text-[11px]">
            <b className="text-[#1c5bc7]">03</b> ESSENTIALS
          </span>
        </div>
      </div>
    </section>
  );
}
