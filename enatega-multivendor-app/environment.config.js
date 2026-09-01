const ENV_CONFIG = {
  development: {
    // Local API exposed over the internet via localtunnel (the office Wi-Fi
    // blocks phone <-> PC on the LAN). Restart the tunnel with:
    //   npx localtunnel --port 4000 --subdomain padharokitapi
    // For LAN testing instead, swap these back to http://<PC-LAN-IP>:4000.
    GRAPHQL_URL: 'https://padharokitapi.loca.lt/graphql',
    WS_GRAPHQL_URL: 'wss://padharokitapi.loca.lt/graphql',
    SERVER_URL: 'https://padharokitapi.loca.lt/graphql',
    SERVER_REST_URL: 'https://padharokitapi.loca.lt/',
    CLARITY_ENABLED: true
  },
  staging: {
    GRAPHQL_URL: 'https://aws-server-v2.enatega.com/graphql',
    WS_GRAPHQL_URL: 'wss://aws-server-v2.enatega.com/graphql',
    SERVER_URL: 'https://aws-server-v2.enatega.com/graphql',
    SERVER_REST_URL: 'https://aws-server-v2.enatega.com/',
    // GRAPHQL_URL: 'http://192.168.1.175:8001/graphql',
    // WS_GRAPHQL_URL: 'wss://192.168.1.175:8001/graphql',
    // SERVER_URL: 'http://192.168.1.175:8001/graphql',
    // SERVER_REST_URL: 'http://192.168.1.175:8001/',
    CLARITY_ENABLED: true
    // GRAPHQL_URL: 'https://3086ptqf-8001.inc1.devtunnels.ms/graphql',
    // WS_GRAPHQL_URL: 'wss://3086ptqf-8001.inc1.devtunnels.ms/graphql',
    // SERVER_URL: 'https://3086ptqf-8001.inc1.devtunnels.ms/graphql',
    // SERVER_REST_URL: 'https://3086ptqf-8001.inc1.devtunnels.ms/',
  },
  production: {
    GRAPHQL_URL: 'https://aws-server-v2.enatega.com/graphql',
    WS_GRAPHQL_URL: 'wss://aws-server-v2.enatega.com/graphql',
    SERVER_URL: 'https://aws-server-v2.enatega.com/graphql',
    SERVER_REST_URL: 'https://aws-server-v2.enatega.com/',
    // GRAPHQL_URL: 'http://192.168.1.175:8001/graphql',
    // WS_GRAPHQL_URL: 'wss://192.168.1.175:8001/graphql',
    // SERVER_URL: 'http://192.168.1.175:8001/graphql',
    // SERVER_REST_URL: 'http://192.168.1.175:8001/',
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
