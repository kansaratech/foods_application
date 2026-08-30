/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
// const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const { withNativeWind } = require("nativewind/metro");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// eslint-disable-next-line no-undef
// const config = getDefaultConfig(__dirname);
const config = getSentryExpoConfig(__dirname);

// config.resolver.disableHierarchicalLookup = true;

// `react-native-maps` (and its `-directions` companion) import native-only
// modules and cannot be bundled for web. The rider app runs on web for local
// dev/testing; swap them for lightweight stubs on the web platform only.
const WEB_STUBS = {
  "react-native-maps": path.resolve(__dirname, "lib/web-stubs/react-native-maps.js"),
  "react-native-maps-directions": path.resolve(
    __dirname,
    "lib/web-stubs/react-native-maps-directions.js",
  ),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && WEB_STUBS[moduleName]) {
    return { type: "sourceFile", filePath: WEB_STUBS[moduleName] };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
