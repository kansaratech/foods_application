/*****************************
 * environment.js
 * path: '/environment.js' (root of your project)
 ******************************/

// Use the machine's LAN IP, not "localhost": on an Android emulator or a
// physical device "localhost" is the device itself, not the dev machine.
const getEnvVars = () => ({
  // Local API exposed over the internet (office Wi-Fi blocks phone<->PC on LAN).
  // Keep-alive: scratchpad/tunnel-keepalive.sh. For LAN, use http://<PC-IP>:4000.
  GRAPHQL_URL: "https://cast-characteristics-sport-absolutely.trycloudflare.com/graphql",
  WS_GRAPHQL_URL: "wss://cast-characteristics-sport-absolutely.trycloudflare.com/graphql",
});

export default getEnvVars;
