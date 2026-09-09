// LocalSell is India-only — everything is ₹ with Indian digit grouping
// (₹1,80,000, not ₹180,000). Do not thread a currency code/locale through here.

const INR_0 = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
});
const INR_2 = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const INR_MONEY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatNumber = (amount: number) => INR_0.format(Number(amount) || 0);

/**
 * `formatNumberWithCurrency(1180)` → "₹1,180.00". Extra args (a currency code /
 * locale from old call sites) are accepted and ignored.
 */
export const formatNumberWithCurrency = (
  amount: number,
  ...ignored: unknown[]
) => {
  void ignored;
  return INR_MONEY.format(Number(amount) || 0);
};

/** "₹1,180" (whole) / "₹1,180.50" (fractional or alwaysDecimals). */
export const formatCurrency = (
  amount: number | string | null | undefined,
  alwaysDecimals = false
) => {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const fmt = alwaysDecimals || !Number.isInteger(safe) ? INR_2 : INR_0;
  return `₹${fmt.format(safe)}`;
};
