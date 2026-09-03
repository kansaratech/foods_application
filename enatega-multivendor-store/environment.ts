/*****************************
 * environment.js
 * path: '/environment.js' (root of your project)
 ******************************/

// Use the machine's LAN IP, not "localhost": on an Android emulator or a
// physical device "localhost" is the device itself, not the dev machine.
//
// `EXPO_PUBLIC_*` values are inlined by Metro at bundle/export time, so the web
// build (padharo-store.kansaratech.com) is pointed at the production API via
// docker-compose build args. When they are unset (local dev) the cloudflared
// tunnel below is used.
const DEFAULT_GRAPHQL_URL =
  "https://cast-characteristics-sport-absolutely.trycloudflare.com/graphql";
const DEFAULT_WS_GRAPHQL_URL =
  "wss://cast-characteristics-sport-absolutely.trycloudflare.com/graphql";

const getEnvVars = () => ({
  GRAPHQL_URL: process.env.EXPO_PUBLIC_GRAPHQL_URL || DEFAULT_GRAPHQL_URL,
  WS_GRAPHQL_URL:
    process.env.EXPO_PUBLIC_WS_GRAPHQL_URL || DEFAULT_WS_GRAPHQL_URL,
});

export default getEnvVars;
