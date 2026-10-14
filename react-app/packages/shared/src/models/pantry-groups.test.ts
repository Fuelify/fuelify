import { describe, expect, it } from 'vitest';
import { aggregatePantryItems, formatPantryAmounts, pantryGroupKey, type PantryItem } from './pantry';
import { pantrySections } from './pantry-sections';

let n = 0;
const item = (name: string, extra: Partial<PantryItem> = {}): PantryItem => ({
  id: `i${++n}`, householdId: 'h', addedBy: 'u', name, brand: null, category: null, storageZone: 'dry', quantity: 1, unit: null, remainingPct: 100,
  status: 'sealed', purchaseDate: null, expirationDate: null, notes: null, imageUrl: null, barcode: null, createdAt: '', updatedAt: '', ...extra,
} as PantryItem);

describe('pantryGroupKey', () => {
  it('ignores case, plurals, sizes and store brands', () => {
    expect(pantryGroupKey('Black beans')).toBe('black bean');
    expect(pantryGroupKey('Kroger Black Beans 15 oz')).toBe('black bean');
    expect(pantryGroupKey('Great Value Black Bean, 15.5 oz.')).toBe('black bean');
    expect(pantryGroupKey('Berries')).toBe('berry');
    expect(pantryGroupKey('Tomatoes')).toBe('tomato');
    expect(pantryGroupKey('Hummus')).toBe('hummus');
    expect(pantryGroupKey('Rao’s Marinara')).not.toBe(pantryGroupKey('Marinara'));
  });
});

describe('aggregatePantryItems', () => {
  const [beans] = aggregatePantryItems([
    item('Black beans', { quantity: 2, unit: 'cans' }),
    item('Kroger Black Beans 15 oz', { quantity: 1, unit: 'can', status: 'open', remainingPct: 40 }),
    item('black beans', { quantity: 1, unit: 'lb', expirationDate: '2027-01-01' }),
    item('Black beans', { quantity: 1, unit: 'cans', status: 'expired' }),
  ]);

  it('names the group by its plainest, capitalized name', () => {
    expect(aggregatePantryItems([item('black beans'), item('Black beans'), item('Kroger Black Beans 15 oz')])[0].name).toBe('Black beans');
  });
  it('groups packages that are the same thing', () => {
    expect(beans).toMatchObject({ name: 'Black beans', itemCount: 4, sealedCount: 2, openCount: 1, expiredCount: 1 });
  });
  it('totals per unit, with what is actually on hand', () => {
    expect(beans.amounts).toEqual([{ unit: 'cans', quantity: 4, onHand: 2.4 }, { unit: 'lb', quantity: 1, onHand: 1 }]);
    expect(formatPantryAmounts(beans.amounts)).toBe('4 cans + 1 lb');
    expect(formatPantryAmounts(beans.amounts, true)).toBe('2.4 of 4 cans + 1 lb');
    expect(beans.onHandPct).toBe(68);
  });
  it('averages % left over open packages only, and lists use-first order', () => {
    expect(beans.avgRemainingPct).toBe(40);
    expect(beans.items.map((i) => i.status)).toEqual(['open', 'sealed', 'sealed', 'expired']);
    expect(beans.items[1].expirationDate).toBe('2027-01-01');
  });
});

describe('zones', () => {
  it('shows a card under each zone with only that zone’s packages', () => {
    const totals = aggregatePantryItems([item('Milk', { storageZone: 'cool', quantity: 1 }), item('Milk', { storageZone: 'frozen', quantity: 2 })]);
    const all = pantrySections(totals);
    expect(all.map((s) => [s.zone, s.categories[0].totals[0].totalQuantity])).toEqual([['cool', 1], ['frozen', 2]]);
  });
});
