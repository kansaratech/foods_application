// Server-authoritative pricing: GST and delivery-fee computation, shared by
// placeOrder, modifyOrder, and the orderPricePreview query so the number a
// customer sees before paying always matches what actually gets charged.

const DEFAULT_REGULAR_GST_RATE = 5; // standard restaurant GST rate (no ITC) when a REGULAR store hasn't set one

export type GstMode = 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED';

export interface GstLine {
  lineTotal: number;
  gstRate: number;
}

export interface GstResult {
  gstMode: GstMode;
  cgst: number;
  sgst: number;
  taxationAmount: number;
}

/**
 * Composition dealers are legally barred from collecting tax separately from
 * the customer (Section 10 CGST Act) — their price is tax-inclusive, full
 * stop, regardless of any rate configured. Unregistered stores never charge
 * GST either. Only a REGULAR store computes real tax, split evenly into
 * CGST/SGST (intra-state only; this platform is same-city hyperlocal delivery,
 * so there's no IGST branch).
 *
 * Discount is applied proportionally to each line's taxable base before
 * computing its tax, so a coupon correctly reduces the GST base — the way a
 * real invoice works — rather than being ignored by tax math or applied twice.
 */
export function computeGst(
  lines: GstLine[],
  itemsTotal: number,
  discountAmount: number,
  gstRegistrationType: string | null | undefined,
): GstResult {
  const gstMode: GstMode =
    gstRegistrationType === 'REGULAR' ? 'REGULAR' : gstRegistrationType === 'COMPOSITION' ? 'COMPOSITION' : 'UNREGISTERED';

  if (gstMode !== 'REGULAR' || itemsTotal <= 0) {
    return { gstMode, cgst: 0, sgst: 0, taxationAmount: 0 };
  }

  const discountRatio = discountAmount > 0 ? Math.min(1, discountAmount / itemsTotal) : 0;
  let totalGst = 0;
  for (const line of lines) {
    const rate = line.gstRate > 0 ? line.gstRate : DEFAULT_REGULAR_GST_RATE;
    const taxableLineValue = line.lineTotal * (1 - discountRatio);
    totalGst += (taxableLineValue * rate) / 100;
  }

  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const sgst = Math.round((totalGst - cgst) * 100) / 100;
  return { gstMode, cgst, sgst, taxationAmount: Math.round((cgst + sgst) * 100) / 100 };
}

/**
 * Mirrors the client-side formula (localsell-web/lib/utils/methods/order.ts,
 * calculateAmount) so delivery fee is computed the same way server-side and
 * can't be overridden by whatever a client sends.
 *
 * A store that has set its own `deliveryFee` (per-km rate) overrides the
 * platform-wide config entirely — this is what the admin's own delivery
 * settings form has always promised ("Delivery Fee (per Km's)... Min Delivery
 * Fee") but nothing actually read until now. Falls back to the global rate
 * for every store that hasn't set one, so existing behavior is unchanged.
 */
export function computeDeliveryFee(
  config: { costType?: string | null; deliveryRate?: number | null },
  distanceKm: number,
  restaurantOverride?: { deliveryFee?: number | null; minDeliveryFee?: number | null },
): number {
  if (restaurantOverride?.deliveryFee != null) {
    const perKmAmount = Math.ceil(distanceKm) * restaurantOverride.deliveryFee;
    return Math.max(perKmAmount, restaurantOverride.minDeliveryFee ?? 0);
  }
  const rate = config.deliveryRate ?? 0;
  if (config.costType === 'fixed') return rate;
  const amount = Math.ceil(distanceKm) * rate;
  return amount > 0 ? amount : rate;
}
