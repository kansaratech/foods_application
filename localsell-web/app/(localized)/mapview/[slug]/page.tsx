"use client";
import { use, useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiMapPin, FiSearch, FiChevronRight } from "react-icons/fi";
import useNearByRestaurantsPreview from "@/lib/hooks/useNearByRestaurantsPreview";
import { useUserAddress } from "@/lib/context/address/address.context";
import { OPEN_LOCATION_PICKER_EVENT } from "@/lib/utils/constants";
import Map from "./components/Map";
import SideList from "./components/SideList";
import styles from "./components/explore.module.css";

export default function MapView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { error, loading, queryData } = useNearByRestaurantsPreview();
  const { userAddress } = useUserAddress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const isFood = slug === "restaurants";
  const data = useMemo(() => queryData.filter(item => item.shopType === (isFood ? "restaurant" : "grocery")).filter(item => `${item.name} ${item.address || ""}`.toLowerCase().includes(query.toLowerCase())), [queryData, isFood, query]);
  const selected = data.some(item => item._id === selectedId) ? selectedId : null;
  const label = isFood ? "restaurants" : "stores";
  const fullAddress = userAddress?.deliveryAddress || "";
  const readableAddress = fullAddress.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3},?\s*/i, "");
  return <main className={styles.explorer}>
    <aside className={styles.sidebar} aria-label="Nearby places">
      <div className={styles.heading}>
        <Link href={isFood ? "/discovery" : "/store"} className={styles.back}><FiArrowLeft /> Back to browsing</Link>
        <p className={styles.eyebrow}>LOCALSELL MAP</p>
        <h1>{isFood ? "Restaurants near you" : "Stores near you"}</h1>
        <p className={styles.headingHint}>Find a local favourite. Explore it on the map.</p>
        <button type="button" className={styles.address} onClick={() => window.dispatchEvent(new Event(OPEN_LOCATION_PICKER_EVENT))}><FiMapPin /><span title={fullAddress}><small>DELIVERY AREA</small><strong>{readableAddress || "Choose your location"}</strong></span><FiChevronRight /></button>
        <label className={styles.search}><FiSearch /><input aria-label={`Filter ${label}`} placeholder={`Find a ${isFood ? "restaurant" : "store"}...`} value={query} onChange={event => setQuery(event.target.value)} /></label>
        <p className={styles.count} role="status">{loading ? "Finding nearby places..." : `${data.length} ${data.length === 1 ? (isFood ? "restaurant" : "store") : label} ${query ? "found" : "nearby"}`}</p>
      </div>
      <div className={styles.results}>
        {error ? <div className={styles.empty}><FiMapPin /><h2>Unable to load places</h2><p>Please refresh and try again.</p></div> : loading ? <div className={styles.empty} role="status">Loading nearby places...</div> : data.length ? <SideList data={data} selectedId={selected} onSelect={setSelectedId} /> : <div className={styles.empty}><FiMapPin /><h2>{query ? "No matching places" : `No ${label} nearby yet`}</h2><p>{query ? "Try another name or clear your search." : "Choose another delivery location to discover places serving that area."}</p><button type="button" onClick={() => query ? setQuery("") : window.dispatchEvent(new Event(OPEN_LOCATION_PICKER_EVENT))}>{query ? "Clear search" : "Change location"}</button></div>}
      </div>
    </aside>
    <section className={styles.map} aria-label="Map of nearby places"><Map data={data} selectedId={selected} onSelect={setSelectedId} /><div className={styles.legend}><span /> Explore nearby <small>Select a place to see its details</small></div></section>
  </main>;
}
