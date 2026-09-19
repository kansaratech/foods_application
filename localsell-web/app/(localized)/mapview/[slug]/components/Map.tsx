"use client";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
import Link from "next/link";
import Image from "@/lib/ui/useable-components/safe-image";
import { FiMapPin, FiX, FiArrowUpRight } from "react-icons/fi";
import { isRestaurantOpen } from "@/lib/utils/constants/isRestaurantOpen";
import { GoogleMapsContext } from "@/lib/context/global/google-maps.context";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import { useUserAddress } from "@/lib/context/address/address.context";
import { useTheme } from "@/lib/providers/ThemeProvider";
import { IRestaurant } from "@/lib/utils/interfaces/restaurants.interface";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants/marketplace";
import { darkMapStyle } from "@/lib/utils/mapStyles/mapStyle";
import styles from "./explore.module.css";
import PlaceOverlay from "./PlaceOverlay";

export function coordinates(item: IRestaurant) {
  const values = item.location?.coordinates;
  if (!values || values.length !== 2 || values.some(value => value == null || !Number.isFinite(Number(value)))) return null;
  const [lng, lat] = values.map(Number);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
const lightStyle = [{ featureType: "poi", stylers: [{ visibility: "off" }] }, { featureType: "transit", stylers: [{ visibility: "off" }] }, { featureType: "water", stylers: [{ color: "#dbeafe" }] }, { featureType: "landscape", stylers: [{ color: "#f3f6fa" }] }];

export default function Map({ data, selectedId, onSelect }: { data: IRestaurant[]; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const { isLoaded, loadError } = useContext(GoogleMapsContext);
  const { GOOGLE_MAPS_KEY } = useConfig();
  const { userAddress } = useUserAddress();
  const { theme } = useTheme();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const points = useMemo(() => data.map((item, index) => ({ item, index, position: coordinates(item) })).filter(point => point.position !== null), [data]);
  const location = userAddress?.location?.coordinates;
  const lat = Number(location?.[1]); const lng = Number(location?.[0]);
  const fallback = useMemo(() => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : { lat: MARKETPLACE_LOCATION.latitude, lng: MARKETPLACE_LOCATION.longitude }, [lat, lng]);
  const fit = useCallback(() => {
    if (!map) return;
    if (!points.length) { map.setCenter(fallback); map.setZoom(13); return; }
    if (points.length === 1) { map.setCenter(points[0].position!); map.setZoom(15); return; }
    const bounds = new google.maps.LatLngBounds(); points.forEach(point => bounds.extend(point.position!)); map.fitBounds(bounds, 90);
    google.maps.event.addListenerOnce(map, "idle", () => { if ((map.getZoom() || 0) > 16) map.setZoom(16); });
  }, [map, points, fallback]);
  useEffect(() => { fit(); }, [fit]);
  const selected = points.find(point => point.item._id === selectedId);
  useEffect(() => { if (map && selected?.position) { if ((map.getZoom() || 0) < 14) map.setZoom(15); map.setCenter(selected.position); map.panBy(0, -Math.min(90, map.getDiv().clientHeight * 0.2)); } }, [map, selected]);
  if (loadError || !GOOGLE_MAPS_KEY) return <div className={styles.mapStatus}>Map unavailable. You can still explore places from the list.</div>;
  if (!isLoaded) return <div className={styles.mapStatus} role="status">Loading your neighbourhood map...</div>;
  return <><GoogleMap onLoad={setMap} onUnmount={() => setMap(null)} mapContainerStyle={{ width: "100%", height: "100%" }} options={{ styles: theme === "dark" ? darkMapStyle : lightStyle, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, gestureHandling: "cooperative", clickableIcons: false, minZoom: 3 }}>
    {points.map(({ item, index, position }) => <PlaceOverlay key={item._id} position={position!} zIndex={item._id === selectedId ? 1000 : index + 1}>
      <button type="button" className={`${styles.placePin} ${item._id === selectedId ? styles.placePinSelected : ""}`} aria-label={`Select ${item.name}`} aria-pressed={item._id === selectedId} onClick={() => onSelect(item._id)} title={item.name}><FiMapPin /><span>{item.name}</span></button>
    </PlaceOverlay>)}
    {selected && <PlaceOverlay position={selected.position!} zIndex={2000}><div className={styles.selectionCard} aria-label="Selected place">
      <Image src={selected.item.image} alt="" width={84} height={84} />
      <div className={styles.selectionDetails}><span className={styles.selectionKicker}>SELECTED ON MAP</span><h2>{selected.item.name}</h2><p>{selected.item.address || (selected.item.shopType === "restaurant" ? "Restaurant" : "Local store")}</p><span className={isRestaurantOpen(selected.item) ? styles.open : styles.closed}>{isRestaurantOpen(selected.item) ? "Open now" : "Closed"}</span><Link href={`/${selected.item.shopType === "restaurant" ? "restaurant" : "store"}/${selected.item.slug}/${selected.item._id}`}>{selected.item.shopType === "restaurant" ? "View menu" : "Visit store"}<FiArrowUpRight /></Link></div>
      <button type="button" className={styles.dismissSelection} aria-label="Clear selected place" onClick={() => onSelect(null)}><FiX /></button>
    </div></PlaceOverlay>}
  </GoogleMap><button type="button" className={styles.fitButton} onClick={() => { onSelect(null); fit(); }}>Show all places</button>
</>;
}
