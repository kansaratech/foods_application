"use client";

import Image from "@/lib/ui/useable-components/safe-image";
import React from "react";
import { ICuisinesCardProps } from "@/lib/utils/interfaces";
import { useRouter } from "next/navigation";

const SquareCard: React.FC<ICuisinesCardProps> = ({
  item,
  cuisines = false,
  showLogo = false,
  shoptype,
}) => {
  const router = useRouter();
  const getImgSrc = showLogo ? item?.logo : item?.image;
  const fallback = "/assets/images/png/freshGroceries.jpg";

  const onClickHandler = () => {
    if (shoptype) {
      router.push(`/shop-type/${item?.slug}`);
      return;
    }
    if (!cuisines) {
      router.push(
        `/${item?.shopType === "restaurant" ? "restaurant" : "store"}/${item?.slug}/${item._id}`,
      );
    } else {
      router.push(`/category/${item.name.toLowerCase().replace(/\s/g, "-")}`);
    }
  };

  // Cuisines + brands (showLogo) → circular thumbnail with the label underneath.
  if (cuisines || showLogo) {
    return (
      <button
        type="button"
        onClick={onClickHandler}
        className="group m-1.5 mb-5 flex w-full flex-col items-center gap-2 text-center"
      >
        <span className="relative block aspect-square w-full max-w-[104px] overflow-hidden rounded-full ring-1 ring-slate-200 transition duration-300 group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-[#1c5bc7] dark:ring-gray-700">
          <Image
            src={getImgSrc || fallback}
            alt={item?.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-110"
          />
        </span>
        <span className="line-clamp-1 w-full text-[13px] font-semibold tracking-[-0.01em] text-slate-800 dark:text-gray-200">
          {item?.name}
        </span>
      </button>
    );
  }

  // Shop types → compact rounded tile with the label overlaid on a gradient.
  if (shoptype) {
    return (
      <button
        type="button"
        onClick={onClickHandler}
        className="group relative m-2 mb-5 block aspect-[4/3] w-full max-w-[240px] overflow-hidden rounded-2xl border border-slate-200 shadow-[0_10px_30px_rgba(22,41,63,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#1c5bc7]/40 hover:shadow-[0_18px_45px_rgba(22,41,63,0.14)] dark:border-gray-700"
      >
        <Image
          src={getImgSrc || fallback}
          alt={item?.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <span className="absolute bottom-2.5 left-3 text-base font-black tracking-[-0.02em] text-white">
          {item?.name}
        </span>
      </button>
    );
  }

  // Fallback: small media card (unused-ish path kept for safety).
  return (
    <div
      onClick={onClickHandler}
      className="group m-2 mb-5 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(22,41,63,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(22,41,63,0.14)] dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="relative h-[120px] w-full">
        <Image src={getImgSrc || fallback} alt={item?.name} fill className="object-cover" />
      </div>
      <div className="px-3 py-2.5">
        <p className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">
          {item?.name}
        </p>
      </div>
    </div>
  );
};

export default SquareCard;
