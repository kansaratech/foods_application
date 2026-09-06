const ENV_CONFIG = {
  development: {
    // Deployed LocalSell backend (Sentora VPS). For LAN testing swap these to
    // http://<PC-LAN-IP>:4000.
    GRAPHQL_URL: 'https://api.localsell.in/graphql',
    WS_GRAPHQL_URL: 'wss://api.localsell.in/graphql',
    SERVER_URL: 'https://api.localsell.in/graphql',
    SERVER_REST_URL: 'https://api.localsell.in/',
    CLARITY_ENABLED: true
  },
  staging: {
    GRAPHQL_URL: 'https://api.localsell.in/graphql',
    WS_GRAPHQL_URL: 'wss://api.localsell.in/graphql',
    SERVER_URL: 'https://api.localsell.in/graphql',
    SERVER_REST_URL: 'https://api.localsell.in/',
    CLARITY_ENABLED: true
  },
  production: {
    GRAPHQL_URL: 'https://api.localsell.in/graphql',
    WS_GRAPHQL_URL: 'wss://api.localsell.in/graphql',
    SERVER_URL: 'https://api.localsell.in/graphql',
    SERVER_REST_URL: 'https://api.localsell.in/',
    CLARITY_ENABLED: true
  }
}

const normalizeEnvironment = (env) => {
  if (env === 'production' || env === 'staging') return env
  return 'development'
}

const getEnvironmentConfig = (env) => {
  return ENV_CONFIG[normalizeEnvironment(env)]
}

module.exports = {
  ENV_CONFIG,
  getEnvironmentConfig,
  normalizeEnvironment
}
