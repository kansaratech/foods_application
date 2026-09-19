"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "@/lib/ui/useable-components/safe-image";
import { FiArrowUpRight, FiMapPin, FiStar, FiCheck } from "react-icons/fi";
import { IRestaurant } from "@/lib/utils/interfaces/restaurants.interface";
import { isRestaurantOpen } from "@/lib/utils/constants/isRestaurantOpen";
import styles from "./explore.module.css";

export default function SideList({ data, selectedId, onSelect }: { data: IRestaurant[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => { if (selectedId) (() => {
    const card = refs.current[selectedId];
    const scroller = card?.parentElement?.parentElement;
    if (!card || !scroller) return;
    const cardBox = card.getBoundingClientRect();
    const listBox = scroller.getBoundingClientRect();
    if (cardBox.top < listBox.top || cardBox.bottom > listBox.bottom) scroller.scrollBy({ top: cardBox.top - listBox.top - 12, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  })(); }, [selectedId]);
  return <div className={styles.cards}>{data.map((item) => {
    const open = isRestaurantOpen(item);
    return <article key={item._id} ref={node => { refs.current[item._id] = node; }} className={`${styles.card} ${selectedId === item._id ? styles.selected : ""}`}>
      <button type="button" className={styles.cardMain} onClick={() => onSelect(item._id)} aria-pressed={selectedId === item._id} aria-label={`Show ${item.name} on map`}>
        <div className={styles.photo}><Image src={item.image} alt="" width={88} height={88} /><span>{selectedId === item._id ? <FiCheck /> : <FiMapPin />}</span></div>
        <div className={styles.details}><h2>{item.name}</h2><p><FiMapPin />{item.address || "Address not listed"}</p><div className={styles.meta}><span><FiStar />{Number(item.reviewAverage) > 0 ? `${Number(item.reviewAverage).toFixed(1)} (${item.reviewCount || 0})` : "New here"}</span><span className={open ? styles.open : styles.closed}>{open ? "Open now" : "Closed"}</span></div></div>
      </button>
      <div className={styles.cardFooter}><span>{selectedId === item._id ? "Selected on map" : "Select to locate on map"}</span><Link href={`/${item.shopType === "restaurant" ? "restaurant" : "store"}/${item.slug}/${item._id}`}>{item.shopType === "restaurant" ? "View menu" : "Visit store"}<FiArrowUpRight /></Link></div>
    </article>;
  })}</div>;
}
