"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Carousel } from "primereact/carousel";

import { ISliderCardComponentProps } from "@/lib/utils/interfaces";

import { useRouter } from "next/navigation";

import Card from "../card";
import SectionHeader from "../section-header";
import { useTranslations } from "next-intl";

const ROW_META: Record<string, { eyebrow?: string; accent?: string }> = {
  "restaurants-near-you": { eyebrow: "Around you", accent: "right now." },
  "most-ordered-restaurants": { eyebrow: "Loved locally", accent: "again & again." },
  "Grocery list": { eyebrow: "Groceries", accent: "at your door." },
  "Top-grocery-picks": { eyebrow: "Pantry picks", accent: "worth the trip." },
  "Order it again": { eyebrow: "Welcome back", accent: "pick up where you left off." },
};
const responsiveOptions = [
  { breakpoint: "1536px", numVisible: 5, numScroll: 2 },
  { breakpoint: "1280px", numVisible: 4, numScroll: 2 },
  { breakpoint: "1024px", numVisible: 3, numScroll: 1 },
  { breakpoint: "768px", numVisible: 2, numScroll: 1 },
  { breakpoint: "480px", numVisible: 1, numScroll: 1 },
];

const SliderCard = <T,>({
  title,
  data,
  last,
  heading,
}: ISliderCardComponentProps<T>) => {
  const t = useTranslations();
  const [numVisible, setNumVisible] = useState(getNumVisible());
  const [isModalOpen, setIsModalOpen] = useState({value: false, id: ""});
  const headingLabel = t.has(heading) ? t(heading) : heading;
  const carouselRef = useRef<React.ElementRef<typeof Carousel>>(null);
  const shouldUseFixedCardColumns = data?.length > 0 && data.length < numVisible;
  const fixedColumnStyle = {
    "--slider-card-column-width": `${100 / numVisible}%`,
  } as React.CSSProperties;

  const handleUpdateIsModalOpen = useCallback((value: boolean, id: string) => {
    if (isModalOpen.value !== value || isModalOpen.id !== id) {
      console.log("value, id", value, id);
      setIsModalOpen({ value, id });
    }
  }, [isModalOpen]);

  const router = useRouter();

  function getNumVisible() {
    if (typeof window === "undefined") return 5;

    const width = window.innerWidth;
    let visibleItems = 5;

    responsiveOptions.forEach((option) => {
      if (width <= parseInt(option.breakpoint)) {
        visibleItems = option.numVisible;
      }
    });

    return visibleItems;
  }

  const clickCarouselNavigator = (selector: ".p-carousel-prev" | ".p-carousel-next") => {
    const carouselElement = carouselRef.current?.getElement();
    const navigatorButton =
      carouselElement?.querySelector<HTMLButtonElement>(selector);

    navigatorButton?.click();
  };

  const next = () => {
    clickCarouselNavigator(".p-carousel-next");
  };

  const prev = () => {
    clickCarouselNavigator(".p-carousel-prev");
  };

  // Effects
  useEffect(() => {
    const handleResize = () => setNumVisible(getNumVisible());

    const handleDeviceChange = () => {
      setNumVisible(getNumVisible());
    };

    window.addEventListener("resize", handleResize);
    window
      .matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener("change", handleDeviceChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window
        .matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
        .removeEventListener("change", handleDeviceChange);
    };
  }, []);

  // see all click handler
  const onSeeAllClick = () => {
    router.push(`/see-all/${title?.toLocaleLowerCase().replace(/\s/g, "-")}`);
  };

    // Check if RTL (client-side only)
    const [isRTL, setIsRTL] = useState(false);
    useEffect(() => {
      setIsRTL(document.documentElement.dir === "rtl");
    }, []);

  const meta = ROW_META[title ?? ""] ?? {};

  return (
    data?.length > 0 && (
      <div
        className={`mt-10 px-4 md:px-6 lg:px-12 xl:px-20 2xl:px-[80px] ${last && "mb-20"}`}
      >
        <SectionHeader
          title={headingLabel}
          accent={meta.accent}
          eyebrow={meta.eyebrow}
          isRTL={isRTL}
          onSeeAll={onSeeAllClick}
          seeAllLabel={t("see_all")}
          showNav
          onPrev={prev}
          onNext={next}
        />

        <Carousel
          ref={carouselRef}
          value={data}
          className={`w-full discovery-carousel custom-navigation-carousel restaurant-card-carousel ${shouldUseFixedCardColumns ? "low-count-carousel" : ""} ${isRTL ? "rtl-carousel" : ""}`}
          style={shouldUseFixedCardColumns ? fixedColumnStyle : undefined}
          itemTemplate={(item) => <Card item={item} isModalOpen={isModalOpen} handleUpdateIsModalOpen={handleUpdateIsModalOpen} />}
          numVisible={numVisible}
          numScroll={1}
          circular
          responsiveOptions={responsiveOptions}
          showIndicators={false}
          showNavigators
        />
      </div>
    )
  );
};

export default SliderCard;
