"use client";

import { ApolloProvider } from "@apollo/client";
import { PrimeReactProvider } from "primereact/api";
import { useEffect, useMemo, useRef } from "react";

import { ToastProvider } from "@/lib/context/global/toast.context";
import AuthProvider from "@/lib/context/auth/auth.context";
import { ConfigurationProvider } from "@/lib/context/configuration/configuration.context";
import { useSetupApollo } from "@/lib/hooks/useSetApollo";
import { UserProvider } from "@/lib/context/User/User.context";
import AppLayout from "@/lib/ui/layouts/global";
import { LocationProvider } from "@/lib/context/Location/Location.context";
import { UserAddressProvider } from "@/lib/context/address/address.context";
import { SearchUIProvider } from "@/lib/context/search/search.context";
import NotificationInitializer from "../NotificationInitialzer";
import FirebaseForegroundHandler from "@/lib/config/FirebaseForegroundHandler";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useSetupApollo();
  const hasCleanedSW = useRef(false);
  const primeReactConfig = useMemo(() => ({ ripple: true }), []);

  // The app used to register a Workbox service worker that precached
  // build-specific `/_next/static` chunk URLs. After any rebuild those URLs
  // 404, the SW answered with ERR_FAILED, and the shell could never hydrate.
  // We no longer use a service worker — actively tear down any lingering
  // registration and its caches so returning visitors self-heal.
  useEffect(() => {
    if (hasCleanedSW.current) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    hasCleanedSW.current = true;

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          // Pull the self-unregistering /sw.js, then drop the registration.
          registration.update().catch(() => {});
          registration.unregister().catch(() => {});
        });
      })
      .catch(() => {});

    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
    }
  }, []);

  return (
    <PrimeReactProvider value={primeReactConfig}>
      <ApolloProvider client={client}>
        <ConfigurationProvider>
          <ToastProvider>
            <AuthProvider>
              <UserProvider>
                <LocationProvider>
                  <UserAddressProvider>
                    <SearchUIProvider>
                      <AppLayout>
                        <NotificationInitializer />
                        <FirebaseForegroundHandler />
                        {children}
                      </AppLayout>
                    </SearchUIProvider>
                  </UserAddressProvider>
                </LocationProvider>
              </UserProvider>
            </AuthProvider>
          </ToastProvider>
        </ConfigurationProvider>
      </ApolloProvider>
    </PrimeReactProvider>
  );
}
