"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback } from "react";

// Interfaces
import { ILocation } from "@/lib/utils/interfaces";

// Hooks
import { useConfig } from "../context/configuration/configuration.context";
import { reverseGeocode } from "../api/google-maps";

type LocationCallback = (error: string | null, location?: ILocation) => void;

export default function useLocation() {
  // Toast Context

  const { SERVER_URL } = useConfig();

  const latLngToGeoString = useCallback(async ({
    latitude,
    longitude,
  }: {
    latitude: number;
    longitude: number;
  }): Promise<string> => {
    const location = await reverseGeocode({
      serverUrl: SERVER_URL,
      latitude,
      longitude,
    });
    return location.formattedAddress || "";
  }, [SERVER_URL]);

  const getCurrentLocation = useCallback((callback?: LocationCallback): void => {
    // Geolocation is only exposed on secure origins and in browsers that
    // implement it — bail with a clear reason instead of throwing.
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      (typeof window !== "undefined" && !window.isSecureContext)
    ) {
      callback?.(
        typeof window !== "undefined" && !window.isSecureContext
          ? "Location is only available on secure (https) pages. Please search for your address instead."
          : "This browser can't share your location. Please search for your address instead.",
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const location = await reverseGeocode({
            serverUrl: SERVER_URL,
            latitude,
            longitude,
          });

          callback &&
            callback(null, {
              label: "Home",
              latitude,
              longitude,
              deliveryAddress: location.formattedAddress || "",
            });
        } catch (error) {
          callback &&
            callback(error instanceof Error ? error.message : String(error));
        }
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission is blocked. Allow it in your browser's site settings, or search for your address."
            : error.code === error.TIMEOUT
              ? "Getting your location took too long. Try again, or search for your address."
              : "Couldn't determine your location. Please search for your address instead.";
        callback && callback(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [SERVER_URL]);

  return {
    getCurrentLocation,
    latLngToGeoString,
  };
}
