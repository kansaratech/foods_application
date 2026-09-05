import { useContext } from "react";

import { ConfigurationContext } from "@/lib/context/global/configuration.context";

const RUPEE = "₹";

/**
 * The store app hard-coded `$` in a dozen places (earnings, wallet, menu…).
 * This resolves the real symbol from `Configuration` and coerces the common
 * legacy values to ₹ so the whole app is consistent.
 */
export function normalizeCurrencySymbol(raw?: string | null): string {
  const value = (raw ?? "").trim();
  if (!value || value === "Rs" || value === "INR" || value === "$" || value === "USD") {
    return RUPEE;
  }
  return value;
}

export function useCurrency() {
  const configuration = useContext(ConfigurationContext);
  const symbol = normalizeCurrencySymbol(configuration?.currencySymbol);

  const format = (amount: number | string | null | undefined, decimals = 2) => {
    const n = Number(amount);
    return `${symbol}${Number.isFinite(n) ? n.toFixed(decimals) : (0).toFixed(decimals)}`;
  };

  return { symbol, format };
}
