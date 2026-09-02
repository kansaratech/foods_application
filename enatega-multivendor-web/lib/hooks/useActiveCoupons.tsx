// Query
import { ACTIVE_COUPONS } from "@/lib/api/graphql/queries";
// Apollo
import { useQuery } from "@apollo/client";
import { useMemo } from "react";

interface IActiveCoupon {
  _id: string;
  title: string;
  discount: number;
  restaurantId: string | null;
}

interface IActiveCouponsData {
  activeCoupons: IActiveCoupon[];
}

/**
 * Live, in-window coupons for the storefront. Pass a `restaurantId` on a store
 * page to also pull that store's own coupons; omit it elsewhere for globals.
 *
 * `bestDiscountFor(restaurantId)` returns the highest % applicable to that store
 * (its own coupons + globals), or `null` when there's nothing.
 * `coupons` is the raw list (for an "offers" strip).
 */
export default function useActiveCoupons(restaurantId?: string | null) {
  const { data, loading } = useQuery<IActiveCouponsData>(ACTIVE_COUPONS, {
    variables: { restaurantId: restaurantId ?? null },
    fetchPolicy: "cache-and-network",
  });

  const coupons = useMemo(() => data?.activeCoupons ?? [], [data]);

  const globalBest = useMemo(
    () =>
      coupons
        .filter((c) => !c.restaurantId)
        .reduce<number | null>((max, c) => (c.discount > (max ?? 0) ? c.discount : max), null),
    [coupons],
  );

  const bestDiscountFor = (rid?: string | null): number | null => {
    const applicable = coupons.filter((c) => !c.restaurantId || c.restaurantId === rid);
    if (applicable.length === 0) return null;
    return Math.round(Math.max(...applicable.map((c) => c.discount)));
  };

  return { coupons, loading, globalBest, bestDiscountFor };
}
