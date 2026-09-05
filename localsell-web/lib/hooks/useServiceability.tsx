// Query
import { SERVICEABILITY } from "@/lib/api/graphql/queries";
// Apollo
import { useQuery } from "@apollo/client";
// Context
import { useUserAddress } from "@/lib/context/address/address.context";

interface IServiceabilityData {
  serviceability: {
    serviceable: boolean;
    storeCount: number;
    nearestArea: string | null;
    nearestDistanceKm: number | null;
  };
}

/**
 * Answers "does any active store deliver to the visitor's chosen location?".
 * `serviceable` is `null` whenever the answer is unknown — no location set, the
 * query is still loading, or it errored — so callers never gate on uncertainty.
 */
const useServiceability = () => {
  const { userAddress } = useUserAddress();
  const latitude = Number(userAddress?.location?.coordinates?.[1]);
  const longitude = Number(userAddress?.location?.coordinates?.[0]);
  const hasLocation =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  const { data, loading, error } = useQuery<IServiceabilityData>(SERVICEABILITY, {
    variables: { latitude, longitude },
    skip: !hasLocation,
    fetchPolicy: "cache-and-network",
  });

  const result = data?.serviceability;
  // Keep the last known answer during a background refetch so the gate does not
  // flicker; only `null` when we genuinely have nothing yet.
  const serviceable: boolean | null =
    !hasLocation || error || !result ? null : result.serviceable;

  return {
    hasLocation,
    loading: loading && !result,
    serviceable,
    storeCount: result?.storeCount ?? 0,
    nearestArea: result?.nearestArea ?? null,
    nearestDistanceKm: result?.nearestDistanceKm ?? null,
    latitude,
    longitude,
  };
};

export default useServiceability;
