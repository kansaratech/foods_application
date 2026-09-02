"use client";
// core
import React, { useEffect, useState } from "react";
import { Carousel } from "primereact/carousel";
// interfaces
import { CuisinesSliderCardComponent } from "@/lib/utils/interfaces";
// router
import { useRouter, usePathname } from "next/navigation";
// ui components
import SquareCard from "../square-card";
import SectionHeader from "../section-header";
import { useTranslations } from "next-intl";

const EYEBROWS: Record<string, string> = {
  "shop-types": "Browse by",
  "Restaurant-cuisines": "Cravings",
  "Grocery-cuisines": "Stock up",
  "Popular-restaurants": "Trending",
  "Popular-stores": "Trending",
  "Our-brands": "Top rated",
};
const ACCENTS: Record<string, string> = {
  "Restaurant-cuisines": "to satisfy.",
  "Grocery-cuisines": "for the week.",
  "Popular-restaurants": "in Deogarh.",
  "Popular-stores": "near you.",
  "Our-brands": "by diners.",
};

// Circular cuisine/brand thumbnails pack tighter than the wide shop-type tiles.
const CIRCLE_OPTS = [
  { breakpoint: "1536px", numVisible: 8, numScroll: 2 },
  { breakpoint: "1280px", numVisible: 7, numScroll: 2 },
  { breakpoint: "1024px", numVisible: 5, numScroll: 2 },
  { breakpoint: "768px", numVisible: 4, numScroll: 1 },
  { breakpoint: "480px", numVisible: 3, numScroll: 1 },
  { breakpoint: "320px", numVisible: 3, numScroll: 1 },
];
const TILE_OPTS = [
  { breakpoint: "1536px", numVisible: 4, numScroll: 1 },
  { breakpoint: "1280px", numVisible: 3, numScroll: 1 },
  { breakpoint: "1024px", numVisible: 3, numScroll: 1 },
  { breakpoint: "768px", numVisible: 2, numScroll: 1 },
  { breakpoint: "480px", numVisible: 1, numScroll: 1 },
  { breakpoint: "320px", numVisible: 1, numScroll: 1 },
];

const CuisinesSliderCard: CuisinesSliderCardComponent = ({
  title,
  data,
  last,
  showLogo,
  cuisines,
  shopTypes,
}) => {
  const responsiveOptions = shopTypes ? TILE_OPTS : CIRCLE_OPTS;
  const desktopVisible = shopTypes ? 4 : 8;

  const [page, setPage] = useState(0);
  const [numVisible, setNumVisible] = useState(getNumVisible());
  const [userInteracted, setUserInteracted] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();

  function getNumVisible() {
    if (typeof window === "undefined") return desktopVisible;
    const width = window.innerWidth;
    if (width > 1536) return desktopVisible;
    const option = responsiveOptions.find(
      (opt) => width <= parseInt(opt.breakpoint)
    );
    return option ? option.numVisible : desktopVisible;
  }

  const numScroll = 1;
  const totalItems = data?.length || 0;

  const next = () => {
    setUserInteracted(true);
    const maxPage = totalItems - numVisible;
    setPage((prevPage) => (prevPage < maxPage ? prevPage + numScroll : 0));
  };

  const prev = () => {
    setUserInteracted(true);
    const maxPage = totalItems - numVisible;
    setPage((prevPage) => (prevPage > 0 ? prevPage - numScroll : maxPage));
  };

  // Handle resize
  useEffect(() => {
    const handleResize = () => setNumVisible(getNumVisible());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (data.length <= numVisible || userInteracted) return;

    const interval = setInterval(() => {
      const maxPage = data.length - numVisible;
      setPage((prevPage) => (prevPage < maxPage ? prevPage + 1 : 0));
    }, 3000);

    return () => clearInterval(interval);
  }, [data.length, numVisible, userInteracted]);

  // Resume auto-scroll after 30s
  useEffect(() => {
    if (!userInteracted) return;
    const timeout = setTimeout(() => setUserInteracted(false), 30000);
    return () => clearTimeout(timeout);
  }, [userInteracted]);

  const onSeeAllClick = () => {
    router.push(`/see-all/${title?.toLocaleLowerCase().replace(/\s/g, "-")}`);
  };

  // Check if RTL (client-side only)
  const [isRTL, setIsRTL] = useState(false);
  const headingLabel = t.has(title) ? t(title) : title;
  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const showSeeAll =
    pathname !== "/store" &&
    pathname !== "/restaurants" &&
    !cuisines &&
    !shopTypes;

  return (
    data?.length > 0 && (
      <div
        className={`mt-10 px-4 md:px-6 lg:px-12 xl:px-20 2xl:px-[80px] ${last && "mb-20"}`}
      >
        <SectionHeader
          title={headingLabel}
          accent={ACCENTS[title]}
          eyebrow={EYEBROWS[title]}
          isRTL={isRTL}
          onSeeAll={showSeeAll ? onSeeAllClick : undefined}
          seeAllLabel={t("see_all")}
          showNav={data.length > numVisible}
          onPrev={prev}
          onNext={next}
        />
        <div
          className="w-full"
          style={
            data.length < numVisible
              ? ({
                  ["--slider-card-column-width" as string]: `${100 / numVisible}%`,
                } as React.CSSProperties)
              : undefined
          }
        >

          <Carousel
            value={data}
            className={`discovery-carousel ${data.length < numVisible ? "low-count-carousel" : ""} ${isRTL ? "rtl-carousel" : ""}`}
            itemTemplate={(item) => (
              <SquareCard item={item} showLogo={showLogo} cuisines={cuisines} shoptype={shopTypes} />
            )}
            numVisible={numVisible}
            numScroll={1}
            responsiveOptions={responsiveOptions}
            showIndicators={false}
            showNavigators={false}
            page={page}
            onPageChange={(e) => setPage(e.page)}
          />
        </div>
      </div>
    )
  );
};

export default CuisinesSliderCard;
