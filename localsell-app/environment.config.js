const ENV_CONFIG = {
  development: {
    // Deployed LocalSell backend (Sentora VPS). For LAN testing swap these to
    // http://<PC-LAN-IP>:4000.
    GRAPHQL_URL: 'https://api.localsell.in/graphql',
    WS_GRAPHQL_URL: 'wss://api.localsell.in/graphql',
    SERVER_URL: 'https://api.localsell.in/graphql',
    SERVER_REST_URL: 'https://api.localsell.in/',
    // Customer web app — used only to host the Cashfree hosted-checkout bridge
    // page the in-app WebView opens (see CashfreeCheckout.js).
    WEB_CLIENT_URL: 'https://localsell.in',
    CLARITY_ENABLED: true
  },
  staging: {
    GRAPHQL_URL: 'https://api.localsell.in/graphql',
    WS_GRAPHQL_URL: 'wss://api.localsell.in/graphql',
    SERVER_URL: 'https://api.localsell.in/graphql',
    SERVER_REST_URL: 'https://api.localsell.in/',
    WEB_CLIENT_URL: 'https://localsell.in',
    CLARITY_ENABLED: true
  },
  production: {
    GRAPHQL_URL: 'https://api.localsell.in/graphql',
    WS_GRAPHQL_URL: 'wss://api.localsell.in/graphql',
    SERVER_URL: 'https://api.localsell.in/graphql',
    SERVER_REST_URL: 'https://api.localsell.in/',
    WEB_CLIENT_URL: 'https://localsell.in',
    CLARITY_ENABLED: true
  }
}

const normalizeEnvironment = (env) => {
  if (env === 'production' || env === 'staging') return env
  return 'development'
}

const getEnvironmentConfig = (env) => {
  const base = ENV_CONFIG[normalizeEnvironment(env)]
  // Local dev override: point at the API on this machine (CORS_ORIGIN="*").
  // The deployed api.localsell.in rejects http://localhost origins, so web
  // login fails against it. Set EXPO_PUBLIC_GRAPHQL_URL in .env to opt in.
  const graphqlUrl = process.env.EXPO_PUBLIC_GRAPHQL_URL
  const wsGraphqlUrl = process.env.EXPO_PUBLIC_WS_GRAPHQL_URL
  // Set EXPO_PUBLIC_WEB_CLIENT_URL (e.g. http://<PC-LAN-IP>:3000) alongside
  // EXPO_PUBLIC_GRAPHQL_URL when testing Cashfree against a local API + web.
  const webClientUrl = process.env.EXPO_PUBLIC_WEB_CLIENT_URL
  if (!graphqlUrl) return base
  const restUrl = graphqlUrl.replace(/\/graphql\/?$/, '/')
  return {
    ...base,
    GRAPHQL_URL: graphqlUrl,
    WS_GRAPHQL_URL: wsGraphqlUrl || base.WS_GRAPHQL_URL,
    SERVER_URL: graphqlUrl,
    SERVER_REST_URL: restUrl,
    WEB_CLIENT_URL: webClientUrl || base.WEB_CLIENT_URL
  }
}

module.exports = {
  ENV_CONFIG,
  getEnvironmentConfig,
  normalizeEnvironment
}
