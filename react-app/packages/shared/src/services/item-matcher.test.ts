import { describe, expect, it } from 'vitest';
import { autoPick, describeMatch, nameCoverage, rankItemMatches, type ProductChoice } from './item-matcher';
import type { ProductOffer } from '../models/grocery';

const offer = (store: ProductOffer['store'], name: string, price: number, extra: Partial<ProductOffer> = {}): ProductOffer => ({
  store, productId: `${store}:${name}`, name, brand: null, size: null, price, promoPrice: null, imageUrl: null, url: null, inStock: true, organic: false, storeBrand: false, ...extra,
});

describe('item matcher', () => {
  it('matches names regardless of spacing and plurals', () => {
    expect(nameCoverage('almond milk', 'Silk Unsweetened Almondmilk, 64 fl oz')).toBe(1);
    expect(nameCoverage('eggs', 'Great Value Large White Egg, 12 ct')).toBe(1);
    expect(nameCoverage('almond milk', 'Great Value 2% Milk')).toBe(0.5);
    expect(nameCoverage('almond milk', 'Bananas')).toBe(0);
  });

  it("puts the household's usual product first, with today's price", () => {
    const history: ProductChoice[] = [{ ingredientKey: 'almond milk', store: 'walmart', productId: 'walmart:Silk Unsweetened Almondmilk', productName: 'Silk Unsweetened Almondmilk', timesChosen: 3, avgPrice: 3.4, lastAt: null }];
    const offers = [
      offer('walmart', 'Great Value Almondmilk Original', 2.5),
      offer('walmart', 'Silk Unsweetened Almondmilk', 3.12, { imageUrl: 'silk.jpg', size: '64 fl oz' }),
      offer('walmart', 'Great Value Whole Milk', 3.0),
    ];
    const ranked = rankItemMatches('almond milk', { history, offers });
    expect(ranked[0]).toMatchObject({ source: 'history', label: 'Silk Unsweetened Almondmilk', price: 3.12, imageUrl: 'silk.jpg', timesChosen: 3 });
    expect(ranked.map((m) => m.label)).toEqual(['Silk Unsweetened Almondmilk', 'Great Value Almondmilk Original', 'Great Value Whole Milk']);
    expect(autoPick('almond milk', ranked)?.label).toBe('Silk Unsweetened Almondmilk');
    expect(describeMatch(ranked[0], () => 'Walmart')).toBe('Silk Unsweetened Almondmilk · 64 fl oz · Walmart $3.12');
  });

  it('uses the pantry for brand and shelf, and fills place info for store results', () => {
    const ranked = rankItemMatches('almond milk', {
      pantry: [{ name: 'Almond milk', brand: 'Califia', category: 'Dairy', storageZone: 'cool', unit: null }],
      offers: [offer('kroger', 'Kroger Almond Milk', 2.79)],
    });
    expect(ranked[0]).toMatchObject({ source: 'pantry', brand: 'Califia', storageZone: 'cool' });
    expect(ranked[1]).toMatchObject({ source: 'store', storageZone: 'cool' });
  });

  it('only auto-picks a store result that clearly is the item', () => {
    const ranked = rankItemMatches('almond milk', { offers: [offer('walmart', 'Great Value 2% Milk', 3)] });
    expect(autoPick('almond milk', ranked)).toBeNull();
    expect(autoPick('almond milk', rankItemMatches('almond milk', { offers: [offer('walmart', 'Silk Almond Milk', 3)] }))?.label).toBe('Silk Almond Milk');
  });
});
