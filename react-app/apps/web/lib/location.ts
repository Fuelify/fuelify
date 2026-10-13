// Location service (server only): city search and "where am I" lookups via
// Photon, the free OpenStreetMap geocoder by Komoot (no key). Called by our
// /api/location routes so results are cached and users' browsers don't talk
// to a third party.

import { placeFromPhoton, type Place } from '@fuelify/shared';

const PHOTON = 'https://photon.komoot.io';
const HEADERS = { 'User-Agent': 'Fuelify/1.0 (https://fuelify-murex.vercel.app)', Accept: 'application/json' };
// Cities, towns and neighborhoods, not streets or shops
const PLACE_LAYERS = ['city', 'district', 'locality', 'county', 'state'];

async function photon(path: string): Promise<Place[]> {
  const res = await fetch(`${PHOTON}${path}`, { headers: HEADERS, next: { revalidate: 60 * 60 * 24 }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Location service error (${res.status})`);
  const body = (await res.json()) as { features?: Parameters<typeof placeFromPhoton>[0][] };
  const seen = new Set<string>();
  return (body.features ?? []).flatMap((f) => {
    const p = placeFromPhoton(f);
    if (!p || seen.has(p.label)) return [];
    seen.add(p.label);
    return [p];
  });
}

export async function searchPlaces(query: string, near?: { lat: number; lon: number }): Promise<Place[]> {
  const params = new URLSearchParams({ q: query.slice(0, 80), limit: '8', lang: 'en' });
  for (const l of PLACE_LAYERS) params.append('layer', l);
  if (near) {
    params.set('lat', String(near.lat));
    params.set('lon', String(near.lon));
  }
  return (await photon(`/api/?${params}`)).slice(0, 6);
}

export async function reversePlace(lat: number, lon: number): Promise<Place | null> {
  // Rounded so nearby lookups share a cache entry and we don't keep exact positions
  const params = new URLSearchParams({ lat: lat.toFixed(3), lon: lon.toFixed(3), limit: '1', lang: 'en' });
  return (await photon(`/reverse?${params}`))[0] ?? null;
}
