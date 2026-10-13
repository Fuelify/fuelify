// Places from the location service (/api/location): a city the person picks
// from search or from their device's location. Shown as "Tampa, FL".

export interface Place {
  /** "Tampa, FL" or "Toronto, Ontario, Canada" */
  label: string;
  city: string | null;
  /** Full state/region name */
  state: string | null;
  postcode: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number;
  lon: number;
}

const US_STATES: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR',
  Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'Puerto Rico': 'PR',
};

/** "Tampa, FL" in the US; "City, Region, Country" elsewhere. */
export function placeLabel(p: { city?: string | null; state?: string | null; country?: string | null; countryCode?: string | null; name?: string | null }): string {
  const city = p.city || p.name || null;
  const us = (p.countryCode ?? '').toUpperCase() === 'US';
  const state = p.state ? (us ? (US_STATES[p.state] ?? p.state) : p.state) : null;
  return [city, state, us ? null : p.country].filter((x, i, a) => x && a.indexOf(x) === i).join(', ');
}

/** A 5-digit US ZIP from a postcode like "33602" or "33602-1234", else null. */
export function usZip(postcode: string | null | undefined): string | null {
  const m = (postcode ?? '').match(/^(\d{5})(?:-\d{4})?$/);
  return m ? m[1] : null;
}

/** One feature from a Photon (OpenStreetMap) geocoder response → Place. */
export function placeFromPhoton(f: { geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }): Place | null {
  const p = (f.properties ?? {}) as Record<string, string | undefined>;
  const [lon, lat] = f.geometry?.coordinates ?? [];
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  // Cities come back as the place itself (name) or as the city of a street/address
  const city = p.city ?? (['city', 'town', 'village', 'district', 'locality'].includes(p.type ?? '') || p.osm_value === 'city' || p.osm_value === 'town' || p.osm_value === 'village' ? p.name : null) ?? p.name ?? null;
  const place = { city, state: p.state ?? null, country: p.country ?? null, countryCode: p.countrycode ?? null };
  const label = placeLabel(place);
  if (!label) return null;
  return { label, ...place, postcode: p.postcode ?? null, lat, lon };
}
