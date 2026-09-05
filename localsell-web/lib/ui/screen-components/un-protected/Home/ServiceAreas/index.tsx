"use client";

import { gql, useQuery } from "@apollo/client";
import { GoogleMap, Polygon } from "@react-google-maps/api";
import Link from "next/link";
import { useContext, useMemo } from "react";

import { GoogleMapsContext } from "@/lib/context/global/google-maps.context";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants";

const GET_SERVICE_AREAS = gql`
  query LandingServiceAreas {
    zones {
      _id
      title
      description
      isActive
      location {
        coordinates
      }
    }
  }
`;

interface ServiceArea {
  _id: string;
  title: string;
  description?: string | null;
  isActive?: boolean | null;
  location?: { coordinates?: number[][][] | null } | null;
}

const toPath = (zone: ServiceArea) =>
  (zone.location?.coordinates?.[0] ?? []).map(([lng, lat]) => ({
    lat: Number(lat),
    lng: Number(lng),
  }));

// Rough great-circle distance in km, enough to keep the landing map focused on
// zones around the current marketplace and ignore legacy test zones elsewhere.
const roughDistanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

const zoneCentroid = (zone: ServiceArea) => {
  const path = toPath(zone);
  if (!path.length) return null;
  return {
    lat: path.reduce((s, p) => s + p.lat, 0) / path.length,
    lng: path.reduce((s, p) => s + p.lng, 0) / path.length,
  };
};

export default function ServiceAreas() {
  const { isLoaded } = useContext(GoogleMapsContext);
  const { data, loading, error, refetch } = useQuery(GET_SERVICE_AREAS, {
    fetchPolicy: "cache-and-network",
  });

  const zones: ServiceArea[] = useMemo(() => {
    const home = {
      lat: MARKETPLACE_LOCATION.latitude,
      lng: MARKETPLACE_LOCATION.longitude,
    };
    const nearby = (data?.zones ?? []).filter((zone: ServiceArea) => {
      if (zone.isActive === false || toPath(zone).length < 3) return false;
      const c = zoneCentroid(zone);
      return c ? roughDistanceKm(home, c) <= 250 : false;
    });
    // Fall back to all valid zones if none are near (e.g. before this location
    // has its own zone seeded) so the section still renders something useful.
    if (nearby.length > 0) return nearby;
    return (data?.zones ?? []).filter(
      (zone: ServiceArea) =>
        zone.isActive !== false && toPath(zone).length > 2,
    );
  }, [data]);
  const allPoints = zones.flatMap(toPath);
  const center = allPoints.length
    ? {
        lat:
          allPoints.reduce((sum, point) => sum + point.lat, 0) /
          allPoints.length,
        lng:
          allPoints.reduce((sum, point) => sum + point.lng, 0) /
          allPoints.length,
      }
    : {
        lat: MARKETPLACE_LOCATION.latitude,
        lng: MARKETPLACE_LOCATION.longitude,
      };

  if (loading && zones.length === 0) {
    return (
      <div className="h-[420px] animate-pulse rounded-[2rem] bg-slate-100 dark:bg-gray-800" />
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-2xl font-black">
          Delivery areas are temporarily unavailable
        </h2>
        <p className="mt-2 text-slate-600 dark:text-gray-300">
          Please retry while we reconnect to the marketplace.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 rounded-full bg-[#16293f] px-5 py-2.5 font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1c5bc7]">
            Live service coverage
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            Delivery areas near you
          </h2>
          <p className="mt-2 text-slate-600 dark:text-gray-300">
            Explore active LocalSell zones and start ordering from available
            stores.
          </p>
        </div>
        <Link
          href="/mapview/restaurants"
          className="rounded-full border border-[#16293f] px-5 py-2.5 text-sm font-bold text-[#16293f] transition hover:bg-[#16293f] hover:text-white"
        >
          Open full map →
        </Link>
      </div>

      <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-gray-700 dark:bg-gray-900 lg:grid-cols-[1.55fr_0.75fr]">
        <div className="h-[420px] bg-slate-100">
          {isLoaded ? (
            <GoogleMap
              center={center}
              zoom={11}
              mapContainerStyle={{ width: "100%", height: "100%" }}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
              onLoad={(map) => {
                if (!allPoints.length) return;
                const bounds = new window.google.maps.LatLngBounds();
                allPoints.forEach((point) => bounds.extend(point));
                map.fitBounds(bounds, 45);
              }}
            >
              {zones.map((zone, index) => (
                <Polygon
                  key={zone._id}
                  paths={toPath(zone)}
                  options={{
                    fillColor: index % 2 === 0 ? "#1c5bc7" : "#16293f",
                    fillOpacity: 0.2,
                    strokeColor: index % 2 === 0 ? "#1a52b4" : "#16293f",
                    strokeOpacity: 0.9,
                    strokeWeight: 2,
                  }}
                />
              ))}
            </GoogleMap>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
              Loading interactive map…
            </div>
          )}
        </div>

        <div className="max-h-[420px] overflow-auto p-5 sm:p-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            {zones.length} active zones
          </p>
          <div className="space-y-3">
            {zones.map((zone, index) => (
              <Link
                key={zone._id}
                href="/discovery"
                className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-[#1c5bc7] hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white"
                  style={{
                    backgroundColor: index % 2 === 0 ? "#1c5bc7" : "#16293f",
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-slate-950 dark:text-white">
                    {zone.title}
                  </strong>
                  <span className="mt-1 block truncate text-sm text-slate-500 dark:text-gray-400">
                    {zone.description || "Active delivery coverage"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
