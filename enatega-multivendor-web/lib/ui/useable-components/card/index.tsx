"use client";

// core
import Image from "@/lib/ui/useable-components/safe-image";
import React from "react";
import { useRouter, usePathname } from "next/navigation";

// Assets
import { FiClock, FiStar } from "react-icons/fi";
import { CycleSvg } from "@/lib/utils/assets/svg";

// Hooks
import { useSearchUI } from "@/lib/context/search/search.context";
import useActiveCoupons from "@/lib/hooks/useActiveCoupons";

// Interface
import { ICardProps } from "@/lib/utils/interfaces";
import { saveSearchedKeyword } from "@/lib/utils/methods";
import { isRestaurantOpen } from "@/lib/utils/constants/isRestaurantOpen";
import CustomDialog from "../custom-dialog";
import Badge from "../badge";
import { Button } from "primereact/button";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import { useTranslations } from "next-intl";

const Card: React.FC<ICardProps> = ({
  item,
  isModalOpen = { value: false, id: "" },
  handleUpdateIsModalOpen = () => {},
}) => {
  const router = useRouter();
  const t = useTranslations();
  const pathname = usePathname();
  const shouldTruncate = item.name?.length > 15;
  const { setIsSearchFocused, setFilter, isSearchFocused, filter } =
    useSearchUI();

  const { DELIVERY_RATE, CURRENCY_SYMBOL } = useConfig();
  const isOpen = isRestaurantOpen(item);

  const { bestDiscountFor } = useActiveCoupons();
  const offerPct = bestDiscountFor(item._id);

  const goToDetail = () => {
    router.push(
      `/${item.shopType === "restaurant" ? "restaurant" : "store"}/${item?.slug}/${item._id}`,
    );
    setFilter("");
    setIsSearchFocused(false);
    saveSearchedKeyword(filter);
  };

  return (
    <div
      className={`group relative m-2 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(140,29,64,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#f5820a]/40 hover:shadow-[0_18px_45px_rgba(140,29,64,0.14)] dark:border-gray-700 dark:bg-gray-800 dark:text-white`}
      onClick={() => {
        if (!isOpen) {
          handleUpdateIsModalOpen(true, item._id);
          return;
        }
        goToDetail();
      }}
    >
      {/* Image */}
      <div
        className={`relative w-full overflow-hidden ${isSearchFocused ? "h-[150px]" : "h-[150px]"}`}
      >
        <Image
          src={item?.image}
          alt={item?.name}
          fill
          className={`object-cover transition duration-500 group-hover:scale-105 ${!isOpen ? "grayscale-[0.55] brightness-90" : ""}`}
          unoptimized
        />
        {!isOpen && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            {t("closed_label")}
          </span>
        )}
        {offerPct ? (
          <Badge
            variant="offer"
            className={`absolute left-3 ${!isOpen ? "top-11" : "top-3"}`}
          >
            {t("offer_percent_off", { pct: offerPct })}
          </Badge>
        ) : null}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-bold text-slate-800 shadow-sm dark:bg-gray-900/90 dark:text-white">
          <FiStar className="h-3 w-3 text-[#f5820a]" />
          {item?.reviewAverage ?? "—"}
        </span>
      </div>

      {/* Content */}
      <div className="px-3.5 py-3">
        <p
          title={shouldTruncate ? item?.name : ""}
          className="line-clamp-1 text-[15px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white"
        >
          {item?.name}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-gray-400">
          {item?.cuisines?.map((cuisine) => cuisine).join(" • ")}
        </p>

        <div className="mt-2 flex items-center gap-2 overflow-hidden whitespace-nowrap border-t border-dashed border-slate-200 pt-2 text-[11px] font-semibold text-slate-600 dark:border-gray-700 dark:text-gray-300">
          <span className="inline-flex items-center gap-1">
            <FiClock className="h-3 w-3 text-[#f5820a]" />
            {item?.deliveryTime}m
          </span>
          <span className="text-slate-300 dark:text-gray-600">•</span>
          <span title="Minimum order">
            {CURRENCY_SYMBOL}
            {item?.minimumOrder}
          </span>
          {DELIVERY_RATE ? (
            <>
              <span className="text-slate-300 dark:text-gray-600">•</span>
              <span className="inline-flex items-center gap-1">
                <CycleSvg />
                {CURRENCY_SYMBOL}
                {DELIVERY_RATE}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Closed Modal */}
      <CustomDialog
        className="max-w-[300px]"
        visible={isModalOpen.value && isModalOpen.id === item._id}
        onHide={() => handleUpdateIsModalOpen(false, item._id)}
      >
        <div className="pt-10 text-center dark:text-white">
          <p className="pb-3 text-lg font-bold">
            {item.shopType === "restaurant" ? "Restaurant" : "Store"}{" "}
            {t("is_closed_label")}
          </p>
          <p className="text-sm">{t("see_menu_prompt")}</p>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 pb-2 pt-9">
            <Button
              style={{ fontSize: "14px", fontWeight: "normal" }}
              onClick={() => handleUpdateIsModalOpen(false, item._id)}
              label={t("close_label")}
              className="min-h-10 w-1/2 rounded-xl bg-slate-100 text-base font-normal text-slate-800 dark:bg-gray-700 dark:text-white"
            />
            <Button
              style={{ fontSize: "14px", fontWeight: "normal" }}
              onClick={() => {
                handleUpdateIsModalOpen(false, item._id);
                setFilter("");
                setIsSearchFocused(false);
                setTimeout(goToDetail, 100);
              }}
              label={t("see_menu_label")}
              className="min-h-10 w-1/2 rounded-xl bg-[#f5820a] text-base font-normal text-white"
            />
          </div>
        </div>
      </CustomDialog>
    </div>
  );
};

export default Card;
