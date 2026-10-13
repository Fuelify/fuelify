import { describe, expect, it } from 'vitest';
import { placeFromPhoton, placeLabel, usZip } from './place';

describe('places', () => {
  it('labels US cities with the state abbreviation and others with region and country', () => {
    expect(placeLabel({ city: 'Tampa', state: 'Florida', country: 'United States', countryCode: 'US' })).toBe('Tampa, FL');
    expect(placeLabel({ city: 'Toronto', state: 'Ontario', country: 'Canada', countryCode: 'CA' })).toBe('Toronto, Ontario, Canada');
    expect(placeLabel({ city: 'Singapore', state: null, country: 'Singapore', countryCode: 'SG' })).toBe('Singapore');
  });

  it('reads Photon results for a city and for an address', () => {
    const city = placeFromPhoton({ geometry: { coordinates: [-82.46, 27.95] }, properties: { name: 'Tampa', type: 'city', state: 'Florida', country: 'United States', countrycode: 'US' } });
    expect(city).toMatchObject({ label: 'Tampa, FL', city: 'Tampa', lat: 27.95, lon: -82.46 });
    const street = placeFromPhoton({ geometry: { coordinates: [-82.45, 27.94] }, properties: { name: 'Channelside Drive', type: 'street', city: 'Tampa', postcode: '33602', state: 'Florida', country: 'United States', countrycode: 'US' } });
    expect(street).toMatchObject({ label: 'Tampa, FL', postcode: '33602' });
    expect(usZip(street!.postcode)).toBe('33602');
    expect(usZip('33602-1234')).toBe('33602');
    expect(usZip('M5V 2T6')).toBeNull();
  });
});
