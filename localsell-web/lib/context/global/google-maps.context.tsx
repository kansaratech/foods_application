"use client";

import React, { createContext } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { IGoogleMapsContext, IGoogleMapsProviderProps } from "../../utils/interfaces";

export const GoogleMapsContext = createContext<IGoogleMapsContext>({ isLoaded: false });

// The application owns one loader. Map screens consume this context and never
// inject or remove the Google script themselves (including during StrictMode).
export const GoogleMapsProvider: React.FC<IGoogleMapsProviderProps> = ({ apiKey, libraries, children }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries,
  });
  return <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>{children}</GoogleMapsContext.Provider>;
};
