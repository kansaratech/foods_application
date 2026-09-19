"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiArrowLeft, FiPause, FiPlay, FiMapPin, FiNavigation } from "react-icons/fi";
import LocationPopover from "../../layout/app-header/location-popover";
import useLocationSearch from "@/lib/hooks/useLocationSearch";
import { OPEN_LOCATION_PICKER_EVENT } from "@/lib/utils/constants";
import { useUserAddress } from "@/lib/context/address/address.context";
import styles from "./hero.module.css";

const categories = [
  { label: "Food", caption: "EAT", href: "/discovery", crop: "890 35 525 420", image: "/assets/images/hero/hero-food.png" },
  { label: "Groceries", caption: "SHOP", href: "/store", crop: "946 455 490 595", image: "" },
  { label: "Essentials", caption: "ESSENTIALS", href: "/store", crop: "20 45 915 990", image: "/assets/images/hero/hero-essentials.png" },
  { label: "Sweets", caption: "SWEETS", href: "/discovery", crop: "0 0 1024 1024", image: "/assets/images/hero/hero-sweets.png" },
];

function Product({ index }: { index: number }) {
  const clipId = useId();
  const [x, y, width, height] = categories[index].crop.split(" ").map(Number);
  if (categories[index].image) {
    return <svg viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMax meet" className={styles.product} role="img" aria-label={categories[index].label}><image href={categories[index].image} width="1536" height="1024" preserveAspectRatio="xMidYMid meet" /></svg>;
  }
  return (
    <svg viewBox={categories[index].crop} className={styles.product} role="img" aria-label={categories[index].label}>
      <defs><clipPath id={clipId}><rect x={x} y={y} width={width} height={height} /></clipPath></defs>
      <image href="/assets/images/hero/localsell-delivery-collage.png" width="1448" height="1086" clipPath={`url(#${clipId})`} />
    </svg>
  );
}

export default function Start() {
  const router = useRouter();
  const [active, setActive] = useState(1);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const { userAddress } = useUserAddress();
  const { detectCurrentLocation, locating, error } = useLocationSearch();
  const satellites = categories.map((_, index) => index).filter(index => index !== active).slice(0, 2);

  useEffect(() => {
    const open = () => setIsLocationOpen(true);
    window.addEventListener(OPEN_LOCATION_PICKER_EVENT, open);
    return () => window.removeEventListener(OPEN_LOCATION_PICKER_EVENT, open);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || interacting || reducedMotion || isLocationOpen) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive(index => (index + 1) % categories.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [paused, interacting, reducedMotion, isLocationOpen, active]);

  const selectSlide = (index: number) => {
    setActive((index + categories.length) % categories.length);
    setPaused(true);
  };

  return (
    <section className={styles.hero} aria-labelledby="landing-heading">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>One app. Everyday possibilities.</p>
          <h1 id="landing-heading" className={styles.heading}>
            Everything you need,
            <span>beautifully delivered.</span>
          </h1>
          <p className={styles.description}>Food, groceries and everyday essentials, brought<br className={styles.desktopBreak} /> together in one simple experience.</p>
          <div className={styles.controls}>
            <div className={styles.searchBar}>
              <button type="button" className={styles.location} onClick={() => setIsLocationOpen(true)} aria-haspopup="dialog" aria-expanded={isLocationOpen} title={userAddress?.deliveryAddress || "Search for a city or delivery address"}>
                <FiMapPin aria-hidden="true" />
                <span>{userAddress?.deliveryAddress || "Search for a city..."}</span>
              </button>
              <button type="button" className={styles.current} disabled={locating} onClick={() => void detectCurrentLocation()}>
                <FiNavigation aria-hidden="true" /> {locating ? "Locating..." : "Current Location"}
              </button>
              <button type="button" className={styles.submit} onClick={() => router.push(categories[active].href)}>
                Show Items <FiArrowRight aria-hidden="true" />
              </button>
            </div>
            <LocationPopover open={isLocationOpen} onClose={() => setIsLocationOpen(false)} currentAddress={userAddress?.deliveryAddress || ""} anchorClassName="left-0 top-full !w-full" />
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.categories} role="group" aria-label="Choose what to explore">
            {categories.map((category, index) => (
              <button key={category.label} type="button" aria-pressed={active === index} className={active === index ? styles.selected : undefined} onClick={() => selectSlide(index)}>{category.label}</button>
            ))}
          </div>
        </div>
        <div className={styles.scene} role="region" aria-roledescription="carousel" aria-label="Everyday delivery categories" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
          <svg className={styles.orbits} viewBox="0 0 760 600" fill="none" aria-hidden="true">
            <g className={styles.orbitPrimary}>
              <g transform="rotate(-27 374 300)">
                <ellipse cx="374" cy="300" rx="330" ry="210" stroke="#1c5bc7" strokeWidth="2.5" />
                <circle cx="44" cy="300" r="7" fill="white" stroke="#1c5bc7" strokeWidth="2.5" />
                <circle cx="374" cy="90" r="5" fill="#1c5bc7" />
                <circle cx="704" cy="300" r="5" fill="#1c5bc7" />
              </g>
            </g>
            <g className={styles.orbitSecondary}>
              <ellipse cx="374" cy="300" rx="308" ry="190" transform="rotate(-24 374 300)" stroke="#94a3b8" strokeWidth="1.3" />
            </g>
          </svg>
          <div className={styles.platform} aria-hidden="true" />
          <span className={styles.mainLabel}><b>0{active + 1}</b> {categories[active].caption}</span>
          <div className={`${styles.mainProduct} ${categories[active].image ? styles.mainGenerated : ""}`} key={active}><Product index={active} /></div>
          {satellites.map((index, position) => (
            <button key={index} type="button" className={`${styles.satellite} ${position === 0 ? styles.top : styles.bottom}`} onClick={() => selectSlide(index)} aria-label={`Explore ${categories[index].label}`}>
              <span className={styles.satelliteLabel}><b>0{index + 1}</b> {categories[index].caption}</span>
              <Product index={index} />
            </button>
          ))}
          <div className={styles.carouselControls}>
            <button type="button" aria-label="Previous slide" onClick={() => selectSlide(active - 1)}><FiArrowLeft /></button>
            <div className={styles.dots}>
              {categories.map((category, index) => <button key={category.label} type="button" aria-label={`Show ${category.label}`} aria-pressed={active === index} onClick={() => selectSlide(index)} className={active === index ? styles.activeDot : undefined} />)}
            </div>
            <button type="button" aria-label="Next slide" onClick={() => selectSlide(active + 1)}><FiArrowRight /></button>
            {!reducedMotion && <button type="button" aria-label={paused ? "Play slideshow" : "Pause slideshow"} onClick={() => setPaused(value => !value)}>{paused ? <FiPlay /> : <FiPause />}</button>}
          </div>
        </div>
      </div>
    </section>
  );
}
