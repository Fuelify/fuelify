import { describe, expect, it } from 'vitest';
import { compareStores, estimateBasket, linePrice, normalizeStore, pricePoints, pricesForItem, zipRegion, type CommunityPrice, type PriceObservation } from './price-book';

const obs = (o: Partial<PriceObservation>): PriceObservation => ({
  id: 'x', userId: 'u', householdId: 'h', storeKey: 'trader-joes', storeName: 'Trader Joe’s', region: '301', itemName: 'banana', itemKey: 'banana',
  price: 0.25, source: 'receipt', observedOn: '2026-10-01', ...o,
});
const comm = (c: Partial<CommunityPrice>): CommunityPrice => ({
  itemKey: 'banana', storeKey: 'aldi', storeName: 'Aldi', scope: 'region', medianPrice: 0.22, observations: 5, households: 3, lastSeen: '2026-10-05', ...c,
});

describe('normalizeStore', () => {
  it('recognizes chains from receipt headers', () => {
    expect(normalizeStore("TRADER JOE'S #712")).toEqual({ key: 'trader-joes', name: 'Trader Joe’s' });
    expect(normalizeStore('Sprouts Farmers Market')).toMatchObject({ key: 'sprouts' });
    expect(normalizeStore('WEGMANS FOOD MARKETS')).toMatchObject({ key: 'wegmans' });
    expect(normalizeStore('Harris Teeter')).toMatchObject({ key: 'kroger' });
    expect(normalizeStore('Wal-Mart Supercenter')).toMatchObject({ key: 'walmart' });
  });
  it('keeps unknown stores by name', () => {
    expect(normalizeStore("JOE'S CORNER MARKET #4 MAIN ST")).toEqual({ key: 'joe-s-corner-market', name: 'Joe\'s Corner Market' });
    expect(normalizeStore('  ')).toBeNull();
  });
});

describe('helpers', () => {
  it('zipRegion and linePrice', () => {
    expect(zipRegion('30188')).toBe('301');
    expect(zipRegion('3018')).toBeNull();
    expect(linePrice({ unitPrice: 2.49 })).toBe(2.49);
    expect(linePrice({ total: 5, quantity: 2 })).toBe(2.5);
    expect(linePrice({ total: 0 })).toBeNull();
  });
});

describe('pricePoints', () => {
  it('prefers your recent price, then nearby, then national', () => {
    const points = pricePoints(
      [obs({ price: 0.29, observedOn: '2026-09-01' }), obs({ price: 0.25, observedOn: '2026-10-01' })],
      [comm({ storeKey: 'trader-joes', storeName: 'Trader Joe’s', medianPrice: 0.19 }), comm({}), comm({ scope: 'national', medianPrice: 0.2 })],
      '2026-10-14',
    );
    const tj = points.find((p) => p.storeKey === 'trader-joes')!;
    expect(tj).toMatchObject({ price: 0.25, basis: 'yours', count: 2 });
    expect(points.find((p) => p.storeKey === 'aldi')).toMatchObject({ basis: 'nearby', price: 0.22 });
  });
  it('ignores your prices older than 120 days', () => {
    const points = pricePoints([obs({ observedOn: '2026-01-01' })], [], '2026-10-14');
    expect(points).toHaveLength(0);
  });
});

describe('baskets', () => {
  const points = pricePoints(
    [
      obs({ itemKey: 'banana', price: 0.25 }),
      obs({ itemKey: 'egg', itemName: 'eggs', price: 3.49 }),
      obs({ itemKey: 'oat milk', itemName: 'oat milk', price: 3.99 }),
    ],
    [comm({ itemKey: 'banana', medianPrice: 0.22 }), comm({ itemKey: 'egg', medianPrice: 2.99 })],
    '2026-10-14',
  );
  const list = [{ name: 'Bananas', quantity: 6 }, { name: 'eggs' }, { name: 'oat milk' }, { name: 'tofu' }];

  it('estimates a store, listing what it has no price for', () => {
    const tj = estimateBasket(list, 'trader-joes', points);
    expect(tj).toMatchObject({ total: 8.98, priced: 3, missing: ['tofu'], storeName: 'Trader Joe’s' });
  });
  it('compares stores fairly by coverage, then shared items', () => {
    const ranked = compareStores(list, points);
    expect(ranked.map((r) => r.storeKey)).toEqual(['trader-joes', 'aldi']);
    expect(ranked[1]).toMatchObject({ priced: 2, total: 4.31, sharedTotal: 4.31 });
    expect(ranked[0].sharedTotal).toBe(4.99);
  });
  it('finds every store price for one item', () => {
    expect(pricesForItem('banana', points).map((p) => p.storeKey)).toEqual(['aldi', 'trader-joes']);
  });
});
