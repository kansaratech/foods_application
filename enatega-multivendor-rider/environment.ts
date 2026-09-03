import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import {  useContext } from "react";
import { ConfigurationContext } from "./lib/context/global/configuration.context";
const getEnvVars = (env = Updates.channel) => {
  // `Updates.channel` is null at runtime unless EAS Update is configured (it is
  // NOT on this app), so it can't be trusted to detect the "demo" build. Use the
  // build-time env var baked by the eas.json "demo" profile instead.
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const isDemo = appEnv === "demo" || env === "demo";
  const configuration = useContext(ConfigurationContext);
  const googleMapsKey =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
      : process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID;
  if (__DEV__) {
    loadDevMessages();
    loadErrorMessages();
  }
  // The "demo" channel is a release build that must still talk to the local
  // (tunnelled) API, not the Enatega production server.
  if (!__DEV__ && !isDemo) {
    return {
      GRAPHQL_URL: "https://padharo-api.kansaratech.com/graphql",
      WS_GRAPHQL_URL: "wss://padharo-api.kansaratech.com/graphql",
      SENTRY_DSN:
        configuration?.riderAppSentryUrl ??
        "https://e963731ba0f84e5d823a2bbe2968ea4d@o1103026.ingest.sentry.io/6135261",
      GOOGLE_MAPS_KEY: googleMapsKey,
      ENVIRONMENT: "production",
    };
  }

  return {
    // Deployed Padharo backend (Sentora VPS). For LAN testing use
    // http://<PC-LAN-IP>:4000 instead.
    GRAPHQL_URL: "https://padharo-api.kansaratech.com/graphql",
    WS_GRAPHQL_URL: "wss://padharo-api.kansaratech.com/graphql",
    SENTRY_DSN:
      configuration?.riderAppSentryUrl ??
      "https://e963731ba0f84e5d823a2bbe2968ea4d@o1103026.ingest.sentry.io/6135261",
    GOOGLE_MAPS_KEY: googleMapsKey,
    ENVIRONMENT: "development",
  };
};

export default getEnvVars;
