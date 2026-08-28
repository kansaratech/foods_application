/*****************************
 * environment.js
 * path: '/environment.js' (root of your project)
 ******************************/

// Use the machine's LAN IP, not "localhost": on an Android emulator or a
// physical device "localhost" is the device itself, not the dev machine.
const getEnvVars = () => ({
  GRAPHQL_URL: "http://192.168.1.127:4000/graphql",
  WS_GRAPHQL_URL: "ws://192.168.1.127:4000/graphql",
});

export default getEnvVars;
