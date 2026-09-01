// Best-effort dev error sink -> API /client-logs. Never throws, never blocks.
const APP = "store";
const DEFAULT_LOG_BASE = "https://cast-characteristics-sport-absolutely.trycloudflare.com/";

function base(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const g = require("@/environment").default;
    const env = typeof g === "function" ? g() : g;
    const url: string = env?.GRAPHQL_URL || env?.SERVER_URL || "";
    if (url) {
      return url.replace(/\/graphql\/?$/, "/");
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOG_BASE;
}

export function logClientIssue(input: {
  level?: string;
  screen?: string;
  message?: string;
  stack?: string;
  extra?: unknown;
}): void {
  try {
    const b = base();
    fetch(`${b}client-logs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        app: APP,
        level: String(input.level ?? "error").slice(0, 12),
        screen: String(input.screen ?? "").slice(0, 60),
        message: String(input.message ?? "").slice(0, 600),
        stack: String(input.stack ?? "").slice(0, 1200),
        extra: input.extra
          ? String(
              typeof input.extra === "string"
                ? input.extra
                : JSON.stringify(input.extra),
            ).slice(0, 800)
          : undefined,
      }),
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function installGlobalErrorLogger(): void {
  try {
    const g: any = global;
    if (g.__padharoErrorLoggerInstalled) {
      return;
    }
    g.__padharoErrorLoggerInstalled = true;
    const EU = g.ErrorUtils;
    if (EU?.getGlobalHandler) {
      const prev = EU.getGlobalHandler();
      EU.setGlobalHandler((error: any, isFatal: boolean) => {
        logClientIssue({
          level: isFatal ? "fatal" : "error",
          message: error?.message || String(error),
          stack: error?.stack || "",
        });
        if (prev) {
          prev(error, isFatal);
        }
      });
    }
  } catch {
    /* ignore */
  }
}
