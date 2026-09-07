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
  const swRegistered = useRef(false);
  const primeReactConfig = useMemo(() => ({ ripple: true }), []);

  // PWA service worker. The earlier one precached build-specific
  // `/_next/static` chunk URLs and got stuck after every rebuild — this one
  // precaches nothing build-specific and serves navigations network-first, so
  // a new deploy is always picked up. See public/sw.js.
  useEffect(() => {
    if (swRegistered.current) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    if (process.env.NODE_ENV !== "production") return;
    swRegistered.current = true;

    const register = () =>
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
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
