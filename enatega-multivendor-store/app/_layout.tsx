/* eslint-disable @typescript-eslint/no-require-imports */
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { installGlobalErrorLogger } from "@/lib/utils/methods/client-logger";
installGlobalErrorLogger();

// Service
import setupApollo from "@/lib/apollo";
import PublicAccessTokenService from "@/lib/services/public-access-token.service";

// Providers
import { AuthProvider } from "@/lib/context/global/auth.context";
import { ConfigurationProvider } from "@/lib/context/global/configuration.context";
import { ApolloProvider } from "@apollo/client";

import { useEffect, useState } from "react";

// Locale
import i18n from "@/i18next";

// Style
import "../global.css";

// Hooks
import { UserProvider } from "@/lib/context/global/user.context";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import FlashMessage from "react-native-flash-message";

// Providers
import InternetProvider from "@/lib/context/global/internet-provider";
// UI
import AppThemeProvidor, { useApptheme } from "@/lib/context/theme.context";
import AnimatedSplashScreen from "@/lib/ui/useable-components/splash/AnimatedSplashScreen";
import UnavailableStatus from "@/lib/ui/useable-components/unavailable-status";

import { Slot } from "expo-router";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  // Hooks
  const { currentTheme, appTheme } = useApptheme();
  const [loaded] = useFonts({
    SpaceMono: require("../lib/assets/fonts/SpaceMono-Regular.ttf"),
    Inter: require("../lib/assets/fonts/Inter.ttf"),
  });

  const [isTokenReady, setIsTokenReady] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(i18n.isInitialized);
  const [client] = useState(() => setupApollo());

  // Never render the app tree (which is full of `useTranslation()` calls) before
  // i18n is initialised — otherwise react-i18next changes its hook count between
  // renders and React 19 crashes in `areHookInputsEqual`.
  useEffect(() => {
    if (i18n.isInitialized) {
      setIsI18nReady(true);
      return;
    }
    const onReady = () => setIsI18nReady(true);
    i18n.on("initialized", onReady);
    return () => {
      i18n.off("initialized", onReady);
    };
  }, []);

  // Use Effect
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    PublicAccessTokenService.initialize(client)
      .then(() => {
        setIsTokenReady(true);
      })
      .catch(() => {
        setIsTokenReady(true);
      });
  }, [client]);

  if (!isTokenReady || !isI18nReady) {
    return null;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ApolloProvider client={client}>
        <AppThemeProvidor>
          <AnimatedSplashScreen>
            <InternetProvider>
              <ConfigurationProvider>
                <AuthProvider client={client}>
                  <StatusBar
                    style={currentTheme ?? "dark"}
                    backgroundColor={appTheme.themeBackground ?? ""}
                  />
                  <UserProvider>
                    <UnavailableStatus />
                    <Slot />
                  </UserProvider>
                </AuthProvider>
              </ConfigurationProvider>
            </InternetProvider>
          </AnimatedSplashScreen>
          <FlashMessage position="center" />
        </AppThemeProvidor>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}

export default RootLayout;
