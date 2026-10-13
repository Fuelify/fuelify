// GET /api/location/reverse?lat=&lon= → { place: Place | null }
// Turns the device's position into a city ("Tampa, FL"). Coordinates are
// rounded (~100 m) before lookup and never stored.

import { reversePlace } from '@/lib/location';
import { signedInUser } from '@/lib/server-auth';

export async function GET(request: Request) {
  if (!(await signedInUser(request))) return Response.json({ error: 'Sign in to use your location.' }, { status: 401 });
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: 'Invalid position.' }, { status: 400 });
  }
  try {
    return Response.json({ place: await reversePlace(lat, lon) });
  } catch {
    return Response.json({ error: 'Couldn’t look up your location right now. Type your city instead.' }, { status: 502 });
  }
}
