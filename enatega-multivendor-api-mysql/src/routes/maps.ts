import { Router } from 'express';
import { prisma } from '../prisma/client';

/**
 * Server-side proxy for the Google Maps HTTP APIs.
 *
 * The frontends never see the Maps key — it lives in the `Configuration` row
 * (editable from Admin -> Management -> Configuration) and is used only here.
 * The original Enatega Mongo API exposed the same `/maps/*` routes; this MySQL
 * rewrite had dropped them, which broke every "use my current location" /
 * address-search flow in the web + apps.
 */

let cachedKey: { value: string | null; at: number } = { value: null, at: 0 };
const KEY_TTL_MS = 60_000;

async function getMapsKey(): Promise<string | null> {
  if (cachedKey.value && Date.now() - cachedKey.at < KEY_TTL_MS) {
    return cachedKey.value;
  }
  const config = await prisma.configuration.findFirst({ select: { googleMapsApiKey: true } });
  cachedKey = { value: config?.googleMapsApiKey ?? process.env.GOOGLE_MAPS_API_KEY ?? null, at: Date.now() };
  return cachedKey.value;
}

type GoogleAddressComponent = { long_name: string; short_name: string; types: string[] };

function pickCity(components: GoogleAddressComponent[] | undefined): string | null {
  if (!components) return null;
  const byType = (type: string) => components.find((c) => c.types.includes(type))?.long_name ?? null;
  return (
    byType('locality') ||
    byType('administrative_area_level_2') ||
    byType('administrative_area_level_1') ||
    null
  );
}

export const mapsRouter = Router();

mapsRouter.get('/reverse-geocode', async (req, res) => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const language = (req.query.language as string) || 'en';

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'latitude and longitude are required' }, data: null });
  }

  const key = await getMapsKey();
  if (!key) {
    return res.status(503).json({ success: false, error: { code: 'NO_KEY', message: 'Google Maps API key is not configured' }, data: null });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${latitude},${longitude}`);
    url.searchParams.set('language', language);
    url.searchParams.set('key', key);

    const response = await fetch(url);
    const body = (await response.json()) as {
      status: string;
      error_message?: string;
      results?: { formatted_address: string; address_components: GoogleAddressComponent[] }[];
    };

    const top = body.results?.[0];
    return res.json({
      success: body.status === 'OK',
      error:
        body.status === 'OK'
          ? null
          : { code: body.status, message: body.error_message || 'Reverse geocode failed' },
      data: {
        status: body.status,
        errorMessage: body.error_message ?? null,
        formattedAddress: top?.formatted_address ?? null,
        city: pickCity(top?.address_components),
      },
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: { code: 'UPSTREAM_ERROR', message: (err as Error).message },
      data: null,
    });
  }
});

mapsRouter.get('/place-autocomplete', async (req, res) => {
  const input = (req.query.input as string)?.trim();
  const language = (req.query.language as string) || 'en';

  if (!input) {
    return res.json({ success: true, data: { predictions: [] } });
  }

  const key = await getMapsKey();
  if (!key) {
    return res.status(503).json({ success: false, error: { code: 'NO_KEY', message: 'Google Maps API key is not configured' }, data: null });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('language', language);
    url.searchParams.set('key', key);

    const response = await fetch(url);
    const body = (await response.json()) as {
      status: string;
      error_message?: string;
      predictions?: { description: string; place_id: string }[];
    };

    return res.json({
      success: body.status === 'OK' || body.status === 'ZERO_RESULTS',
      error:
        body.status === 'OK' || body.status === 'ZERO_RESULTS'
          ? null
          : { code: body.status, message: body.error_message || 'Autocomplete failed' },
      data: {
        predictions: (body.predictions ?? []).map((p) => ({
          description: p.description,
          placeId: p.place_id,
        })),
      },
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: { code: 'UPSTREAM_ERROR', message: (err as Error).message },
      data: null,
    });
  }
});

mapsRouter.get('/place-detail', async (req, res) => {
  const placeId = (req.query.placeId as string)?.trim();
  const language = (req.query.language as string) || 'en';

  if (!placeId) {
    return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'placeId is required' }, data: null });
  }

  const key = await getMapsKey();
  if (!key) {
    return res.status(503).json({ success: false, error: { code: 'NO_KEY', message: 'Google Maps API key is not configured' }, data: null });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('language', language);
    url.searchParams.set('fields', 'formatted_address,geometry,address_components');
    url.searchParams.set('key', key);

    const response = await fetch(url);
    const body = (await response.json()) as {
      status: string;
      error_message?: string;
      result?: {
        formatted_address: string;
        geometry?: { location?: { lat: number; lng: number } };
        address_components?: GoogleAddressComponent[];
      };
    };

    const loc = body.result?.geometry?.location;
    return res.json({
      success: body.status === 'OK',
      error:
        body.status === 'OK'
          ? null
          : { code: body.status, message: body.error_message || 'Place details failed' },
      data: {
        formattedAddress: body.result?.formatted_address ?? null,
        city: pickCity(body.result?.address_components),
        latitude: loc?.lat ?? null,
        longitude: loc?.lng ?? null,
      },
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: { code: 'UPSTREAM_ERROR', message: (err as Error).message },
      data: null,
    });
  }
});
