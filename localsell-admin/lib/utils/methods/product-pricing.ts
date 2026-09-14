export interface ProductPricingSettings {
  commissionRate?: number | null;
  tax?: number | null;
  gstRegistrationType?: string | null;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** One-item estimate matching order.service, pricing.service and commission.ts.
 * Coupons, add-ons and order-level adjustments are not part of this preview. */
export function productVariantPricing(
  variation: { price: number; discounted?: number | null },
  settings: ProductPricingSettings,
  gstOverride?: number | null,
  defaultCommissionRate?: number | null
) {
  const price =
    variation.discounted != null &&
    variation.discounted > 0 &&
    variation.discounted < variation.price
      ? variation.discounted
      : variation.price;
  const commissionRate =
    settings.commissionRate && settings.commissionRate > 0
      ? settings.commissionRate
      : defaultCommissionRate && defaultCommissionRate > 0
        ? defaultCommissionRate
        : 20;
  const configuredGst = gstOverride ?? settings.tax ?? 0;
  const gstRate =
    settings.gstRegistrationType === 'REGULAR'
      ? configuredGst > 0
        ? configuredGst
        : 5
      : 0;
  const rawGst = (price * gstRate) / 100;
  const cgst = round(rawGst / 2);
  const gst = round(cgst + round(rawGst - cgst));
  const commission = round((price * commissionRate) / 100);
  return {
    price,
    discount: round(variation.price - price),
    gstRate,
    gst,
    commissionRate,
    commission,
    customerPays: round(price + gst),
    earnings: round(price - commission),
  };
}
