import { getEnvironmentConfig } from '../../environment.config'

// Best-effort dev error sink: POSTs runtime errors / GraphQL failures to the
// API's /client-logs endpoint so issues can be triaged from server-side log
// files instead of one screenshot at a time. Never throws, never blocks.

const APP = 'customer'
const DEFAULT_BASE = 'https://cast-characteristics-sport-absolutely.trycloudflare.com/'
let baseUrl = null

function resolveBase() {
  if (baseUrl) return baseUrl
  try {
    const cfg = getEnvironmentConfig(undefined)
    // SERVER_REST_URL is "https://…/"; fall back to deriving from GRAPHQL_URL.
    const rest =
      cfg?.SERVER_REST_URL ||
      (cfg?.GRAPHQL_URL || '').replace(/\/graphql\/?$/, '/')
    if (rest) baseUrl = rest.replace(/\/?$/, '/')
  } catch {
    /* ignore */
  }
  if (!baseUrl) baseUrl = DEFAULT_BASE
  return baseUrl
}

let queue = []
let flushing = false

async function flush() {
  const base = resolveBase()
  if (!base || flushing || queue.length === 0) return
  flushing = true
  const batch = queue.splice(0, queue.length)
  for (const entry of batch) {
    try {
      await fetch(`${base}client-logs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ app: APP, ...entry })
      })
    } catch {
      /* drop it — logging must never break the app */
    }
  }
  flushing = false
}

export function logClientIssue({ level = 'error', screen = '', message = '', stack = '', extra } = {}) {
  try {
    queue.push({
      level: String(level).slice(0, 12),
      screen: String(screen).slice(0, 60),
      message: String(message).slice(0, 600),
      stack: String(stack || '').slice(0, 1200),
      extra: extra ? String(typeof extra === 'string' ? extra : JSON.stringify(extra)).slice(0, 800) : undefined
    })
    if (queue.length > 50) queue = queue.slice(-50)
    setTimeout(flush, 300)
  } catch {
    /* ignore */
  }
}

// Global JS error handler (uncaught render / logic errors).
export function installGlobalErrorLogger() {
  try {
    const g = global
    if (g.__padharoErrorLoggerInstalled) return
    g.__padharoErrorLoggerInstalled = true
    const ErrorUtils = g.ErrorUtils
    if (ErrorUtils?.getGlobalHandler) {
      const prev = ErrorUtils.getGlobalHandler()
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        logClientIssue({
          level: isFatal ? 'fatal' : 'error',
          message: error?.message || String(error),
          stack: error?.stack || ''
        })
        if (prev) prev(error, isFatal)
      })
    }
  } catch {
    /* ignore */
  }
}
