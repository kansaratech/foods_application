import { useContext } from "react";

import { ConfigurationContext } from "@/lib/context/global/configuration.context";

const RUPEE = "₹";

/**
 * Resolve the real currency symbol from `Configuration`, coercing the common
 * legacy / placeholder values to ₹ so amounts never render as "$" or blank.
 */
export function normalizeCurrencySymbol(raw?: string | null): string {
  const value = (raw ?? "").trim();
  if (
    !value ||
    value === "Rs" ||
    value === "Rs." ||
    value === "INR" ||
    value === "$" ||
    value === "USD"
  ) {
    return RUPEE;
  }
  return value;
}

const inGroups = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const inGroups2 = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * India-formatted currency. `format(1180)` → "₹1,180", `format(1180.5, true)`
 * → "₹1,180.50". Uses the Indian digit grouping (₹1,80,000).
 */
export function useCurrency() {
  const configuration = useContext(ConfigurationContext);
  const symbol = normalizeCurrencySymbol(configuration?.currencySymbol);

  const format = (amount: number | string | null | undefined, alwaysDecimals = false) => {
    const n = Number(amount);
    const safe = Number.isFinite(n) ? n : 0;
    return `${symbol}${(alwaysDecimals ? inGroups2 : inGroups).format(safe)}`;
  };

  return { symbol, format };
}
