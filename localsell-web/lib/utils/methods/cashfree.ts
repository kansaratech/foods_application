// Shared helper for loading Cashfree's hosted-checkout JS SDK — used by both
// the checkout screen (starting a payment) and the cashfree-return screen
// (retrying a failed one), since each is a separate page load and neither
// can assume `window.Cashfree` is already present.
const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

export function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if ((window as any).Cashfree) return resolve();
    const existing = document.querySelector(`script[src="${CASHFREE_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Cashfree SDK failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = CASHFREE_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cashfree SDK failed to load"));
    document.body.appendChild(script);
  });
}

/** Cashfree JS SDK's `mode` option string, derived from our own "TEST"/"PRODUCTION" Configuration naming. */
export function cashfreeSdkMode(env: string | undefined): "sandbox" | "production" {
  return env === "PRODUCTION" ? "production" : "sandbox";
}
