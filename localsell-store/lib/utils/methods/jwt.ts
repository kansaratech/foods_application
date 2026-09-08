/**
 * Reads the `exp` claim from a JWT *without* verifying its signature — that's the
 * API's job. Used to pre-empt a request the server is certain to reject, so an
 * expired merchant is sent to login instead of tapping "Accept" and seeing
 * nothing happen.
 *
 * Any parsing problem returns `false` ("let the server decide"): the error link
 * is the real safety net, this is just an optimisation and must never sign a
 * merchant out on its own.
 */
export function isJwtExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = typeof atob === "function" ? atob(normalized) : "";
    if (!decoded) return false;
    const claims = JSON.parse(decoded) as { exp?: number };
    if (typeof claims.exp !== "number") return false;
    // 10s skew so we don't race the exact expiry boundary.
    return claims.exp * 1000 <= Date.now() + 10_000;
  } catch {
    return false;
  }
}
