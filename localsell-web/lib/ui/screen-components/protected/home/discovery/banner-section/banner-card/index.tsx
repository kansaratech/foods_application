// core
import React, { useState } from "react";
import Image from '@/lib/ui/useable-components/safe-image';
// interface
import { IBannerItemProps } from "@/lib/utils/interfaces";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const BannerCard: React.FC<IBannerItemProps> = ({ item }) => {
  const isVideo = item?.file?.includes(".mp4") || item?.file?.includes(".webm") || item?.file?.includes("video");
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const router = useRouter();
  const onClickHandler = () => {
    if (item?.action === "Navigate Specific Restaurant") {
      router.push(
        `/${item?.shopType === "restaurant" ? "restaurant" : "store"}/${item?.slug}/${item?.screen}`
      );
    } else {
      if (item?.screen === "Top Brands") {
        router.push("/see-all/popular-stores");
      } else if (item?.screen === "Near By Restaurants") {
        router.push("/see-all/restaurants-near-you");
      } else {
        router.push("/store");
      }
    }
  };

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item?.couponCode) return;
    navigator.clipboard?.writeText(item.couponCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <div
        className="carousel-item relative cursor-pointer mx-[6px] md:mx-[12px]"
        onClick={onClickHandler}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent rounded-xl opacity-70"></div>
        {isVideo ? (
          <video
            width={890}
            height={300}
            loop
            muted
            playsInline
            autoPlay
            preload="none"
            style={{ borderRadius: 12 }}
            className="carousel-banner"
          >
            <source src={item?.file} type="video/mp4" />
            <source src={item?.file} type="video/webm" />
          </video>
        ) : (
          <Image
            src={item?.file}
            width={480}
            height={300}
            alt={item?.title}
            style={{ borderRadius: 12, objectFit: "contain" }}
            className="carousel-banner"
          />
        )}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-lg sm:text-2xl font-bold sm:font-extrabold">
            {item?.title}
          </p>
          <p className="text-xs sm:text-sm font-medium">{item?.description}</p>
          {item?.couponCode ? (
            <button
              type="button"
              onClick={copyCode}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-orange px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:brightness-95"
            >
              {copied
                ? t("coupon_copied")
                : t("campaign_use_code", { code: item.couponCode })}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default BannerCard;
