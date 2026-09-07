"use client";

import { useCallback, useRef, useState } from "react";

import { useConfig } from "@/lib/context/configuration/configuration.context";
import { useUserAddress } from "@/lib/context/address/address.context";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import { USER_CURRENT_LOCATION_LS_KEY } from "@/lib/utils/constants";

export interface IPlacePrediction {
  description: string;
  placeId: string;
}

const trimSlash = (url: string) => (url.endsWith("/") ? url.slice(0, -1) : url);

/**
 * Delivery-location search backed by the API's `/maps/*` proxy (the Google key
 * stays server-side). Handles both "use my current location" (GPS →
 * reverse-geocode) and typed address search (autocomplete → place detail), and
 * persists the chosen location so every screen picks it up.
 */
export default function useLocationSearch() {
  const { SERVER_URL } = useConfig();
  const { setUserAddress } = useUserAddress();
  const base = trimSlash(SERVER_URL || "");

  const [predictions, setPredictions] = useState<IPlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const persist = useCallback(
    (deliveryAddress: string, longitude: number, latitude: number) => {
      const address = {
        _id: "",
        label: "Home",
        deliveryAddress,
        location: { coordinates: [longitude, latitude] as [number, number] },
      };
      onUseLocalStorage("save", USER_CURRENT_LOCATION_LS_KEY, JSON.stringify(address));
      setUserAddress(address);
    },
    [setUserAddress],
  );

  const search = useCallback(
    (input: string) => {
      setError(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const query = input.trim();
      if (query.length < 3) {
        setPredictions([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      const seq = ++seqRef.current;
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `${base}/maps/place-autocomplete?input=${encodeURIComponent(query)}&language=en`,
          );
          const body = await res.json();
          if (seq !== seqRef.current) return; // a newer keystroke won
          setPredictions(body?.data?.predictions ?? []);
        } catch {
          if (seq === seqRef.current) {
            setPredictions([]);
            setError("Couldn't reach address search. Try again.");
          }
        } finally {
          if (seq === seqRef.current) setSearching(false);
        }
      }, 350);
    },
    [base],
  );

  const choosePrediction = useCallback(
    async (prediction: IPlacePrediction) => {
      setError(null);
      setLocating(true);
      try {
        const res = await fetch(
          `${base}/maps/place-detail?placeId=${encodeURIComponent(prediction.placeId)}&language=en`,
        );
        const body = await res.json();
        const d = body?.data;
        if (!body?.success || d?.latitude == null || d?.longitude == null) {
          throw new Error(body?.error?.message || "Couldn't locate that address.");
        }
        persist(d.formattedAddress || prediction.description, d.longitude, d.latitude);
        setPredictions([]);
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      } finally {
        setLocating(false);
      }
    },
    [base, persist],
  );

  const detectCurrentLocation = useCallback(() => {
    setError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      (typeof window !== "undefined" && !window.isSecureContext)
    ) {
      setError(
        typeof window !== "undefined" && !window.isSecureContext
          ? "Your browser only shares location on secure (https) pages. Search for your area below."
          : "Location isn't available in this browser. Search for your area below.",
      );
      return Promise.resolve(false);
    }

    setLocating(true);

    const onOk = async (
      position: GeolocationPosition,
      resolve: (v: boolean) => void,
    ) => {
      const { latitude, longitude } = position.coords;
      try {
        const res = await fetch(
          `${base}/maps/reverse-geocode?latitude=${latitude}&longitude=${longitude}&language=en`,
        );
        const body = await res.json();
        const label =
          body?.data?.formattedAddress ||
          `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        persist(label, longitude, latitude);
      } catch {
        // Still usable — we have coordinates, just no readable label.
        persist(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, longitude, latitude);
      } finally {
        setLocating(false);
        resolve(true);
      }
    };

    const messageFor = (geoErr: GeolocationPositionError) =>
      geoErr.code === geoErr.PERMISSION_DENIED
        ? "Location permission is blocked. Allow it in your browser's site settings, or search for your area below."
        : geoErr.code === geoErr.TIMEOUT
          ? "Getting your location took too long. Try again, or search for your area below."
          : "Couldn't pin your location. Search for your area below.";

    return new Promise<boolean>((resolve) => {
      // First a quick, low-power fix (works on desktops with no GPS). If the
      // device can't provide one, retry once with high accuracy + a longer
      // window before giving up.
      navigator.geolocation.getCurrentPosition(
        (position) => onOk(position, resolve),
        (firstErr) => {
          if (firstErr.code === firstErr.PERMISSION_DENIED) {
            setLocating(false);
            setError(messageFor(firstErr));
            resolve(false);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => onOk(position, resolve),
            (secondErr) => {
              setLocating(false);
              setError(messageFor(secondErr));
              resolve(false);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
          );
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
      );
    });
  }, [base, persist]);

  const reset = useCallback(() => {
    setPredictions([]);
    setError(null);
    setSearching(false);
  }, []);

  return {
    predictions,
    searching,
    locating,
    error,
    search,
    choosePrediction,
    detectCurrentLocation,
    reset,
  };
}
