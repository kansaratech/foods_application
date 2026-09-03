interface IReverseGeocodeResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
  } | null;
  data: {
    status: string;
    errorMessage: string | null;
    formattedAddress: string | null;
    city: string | null;
  } | null;
}

const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

export async function reverseGeocode({
  serverUrl,
  latitude,
  longitude,
}: {
  serverUrl: string;
  latitude: number;
  longitude: number;
}) {
  const response = await fetch(
    `${normalizeBaseUrl(serverUrl)}/maps/reverse-geocode?${new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      language: 'en',
    }).toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  );

  const payload: IReverseGeocodeResponse = await response.json();

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message || 'Unable to fetch address.');
  }

  return payload.data;
}

export interface IPlacePrediction {
  description: string;
  placeId: string;
}

/** Address type-ahead via the API `/maps` proxy (Google key stays server-side). */
export async function placeAutocomplete({
  serverUrl,
  input,
}: {
  serverUrl: string;
  input: string;
}): Promise<IPlacePrediction[]> {
  if (!input || input.trim().length < 3) return [];
  const res = await fetch(
    `${normalizeBaseUrl(serverUrl)}/maps/place-autocomplete?${new URLSearchParams({
      input: input.trim(),
      language: 'en',
    }).toString()}`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
  );
  const body = await res.json();
  return (body?.data?.predictions ?? []) as IPlacePrediction[];
}

/** Resolve a prediction to { formattedAddress, city, latitude, longitude }. */
export async function placeDetail({
  serverUrl,
  placeId,
}: {
  serverUrl: string;
  placeId: string;
}) {
  const res = await fetch(
    `${normalizeBaseUrl(serverUrl)}/maps/place-detail?${new URLSearchParams({
      placeId,
      language: 'en',
    }).toString()}`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
  );
  const body = await res.json();
  if (!body?.success || body?.data?.latitude == null) {
    throw new Error(body?.error?.message || 'Could not locate that address.');
  }
  return body.data as {
    formattedAddress: string | null;
    city: string | null;
    latitude: number;
    longitude: number;
  };
}
