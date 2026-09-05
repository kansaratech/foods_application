/**
 * The city / town the public landing page is scoped to. The landing sections
 * ("Popular in <city>", store count, service-area map fallback) use this so
 * they all agree on one location. Change these four values to relaunch the
 * marketplace in a different place.
 */
export const MARKETPLACE_LOCATION = {
  /** Shown in headings and copy, e.g. "Popular in Deogarh". */
  city: "Deogarh",
  /** Longer label for taglines, e.g. footer copy. */
  region: "Deogarh, Rajsamand",
  latitude: 25.534,
  longitude: 73.899,
  /** How far out (km) a store still counts as "in" this marketplace. */
  radiusKm: 60,
} as const;
