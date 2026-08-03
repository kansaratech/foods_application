/*****************************
 * environment.js
 * path: '/environment.js' (root of your project)
 ******************************/

const getEnvVars = () => ({
  GRAPHQL_URL: "http://localhost:4000/graphql",
  WS_GRAPHQL_URL: "ws://localhost:4000/graphql",
});

export default getEnvVars;
