"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Card from "@/lib/ui/useable-components/card";
import SliderSkeleton from "@/lib/ui/useable-components/custom-skeletons/slider.loading.skeleton";
import { IMainSectionProps } from "@/lib/utils/interfaces";
import { useSearchUI } from "@/lib/context/search/search.context";
import CustomButton from "../button";
import { useRouter } from "next/navigation";
import { saveSearchedKeyword } from "@/lib/utils/methods";
import EmptySearch from "../empty-search-results";
import { useTranslations } from "next-intl";

function MainSection({
  title,
  data,
  error,
  loading,
  search,
  hasMore,
  queryData,
  onLoadMore,
}: IMainSectionProps ) {
  const router = useRouter();
  const t = useTranslations();
  const { isSearchFocused, setIsSearchFocused, filter } = useSearchUI();

  // Infinite scroll via a viewport sentinel — robust no matter which ancestor
  // element actually scrolls (the home layout scrolls an inner div, not window).
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) onLoadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, loading, data?.length]);

  const [isModalOpen, setIsModalOpen] = useState({ value: false, id: "" });
  const handleUpdateIsModalOpen = useCallback(
    (value: boolean, id: string) => {
      if (isModalOpen.value !== value || isModalOpen.id !== id) {
        setIsModalOpen({ value, id });
      }
    },
    [isModalOpen]
  );

  if (loading && (!data || data.length === 0)) {
    return <SliderSkeleton />;
  }

  // Don't blank the whole page on a fetch error — say what happened and let
  // the user retry with a reload.
  if (error && (!data || data.length === 0)) {
    return (
      <div className="mb-20 flex flex-col items-center gap-3 py-16 text-center text-gray-500 dark:text-gray-400">
        <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
          {t("something_went_wrong")}
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-full border border-primary-color px-5 py-2 text-sm font-semibold text-primary-color transition hover:bg-primary-color/5"
        >
          {t("retry_button")}
        </button>
      </div>
    );
  }

  const onSeeAllClick = () => {
    setIsSearchFocused(false);
    saveSearchedKeyword(filter);
    const keyword = title
      ?.split(":")[1]
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (keyword) {
      router.push(`/search/${keyword}`);
    }
  };

  return (
    <div className="mb-20">
      <div className="mx-[6px] flex items-center gap-0 justify-between">
        <span className="font-inter font-bold text-xl sm:text-2xl leading-8 tracking-normal text-gray-900 dark:text-white">
          {title}
        </span>
        {search && (
          <CustomButton
            label={t("see_all")}
            onClick={onSeeAllClick}
            className="text-secondary-color dark:text-primary-color transition-colors duration-200 text-sm md:text-base"
          />
        )}
      </div>
        {/* if queryData.length not zero then show */}
      {data?.length > 0 && queryData?.length !== 0 ? (
        <>
          <div
            className={`grid grid-cols-1 gap-2 mt-4 items-center ${
              isSearchFocused
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "md:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {data.map((item) => (
              <Card
                key={item._id}
                item={item}
                isModalOpen={isModalOpen}
                handleUpdateIsModalOpen={handleUpdateIsModalOpen}
              />
            ))}
          </div>

          {/* Loader for pagination */}
          {loading && hasMore && (
            <div className="flex justify-center mt-6">
            <div className="flex items-center gap-2 text-gray-500">
              <svg
                className="animate-spin h-5 w-5 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <span>Loading more...</span>
            </div>
          </div>
          )}

          {/* Sentinel the IntersectionObserver watches to auto-load the next page */}
          {hasMore && onLoadMore && <div ref={sentinelRef} aria-hidden className="h-1 w-full" />}

          {/* Fallback "Load more" button if the observer never fires */}
          {hasMore && !loading && onLoadMore && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={onLoadMore}
                className="rounded-full border border-primary-color px-6 py-2 text-sm font-semibold text-primary-color transition hover:bg-primary-color/5"
              >
                {t("load_more")}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <EmptySearch />
        </div>
      )}
    </div>
  );
}

export default MainSection;
