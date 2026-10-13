// GET /api/location/search?q=tam[&lat=&lon=] → { places: Place[] }
// City search for the profile's location field (signed-in users).

import { searchPlaces } from '@/lib/location';
import { signedInUser } from '@/lib/server-auth';

export async function GET(request: Request) {
  if (!(await signedInUser(request))) return Response.json({ error: 'Sign in to search places.' }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return Response.json({ places: [] });
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  try {
    const places = await searchPlaces(q, Number.isFinite(lat) && Number.isFinite(lon) && url.searchParams.has('lat') ? { lat, lon } : undefined);
    return Response.json({ places });
  } catch {
    return Response.json({ error: 'Location search isn’t available right now. Type your city instead.' }, { status: 502 });
  }
}
