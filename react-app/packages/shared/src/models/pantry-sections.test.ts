import { describe, expect, it } from 'vitest';
import { aggregatePantryItems, type PantryItem } from './pantry';
import { pantryCategoryOf, pantrySections } from './pantry-sections';

let n = 0;
const item = (name: string, storageZone: PantryItem['storageZone'], category: string | null = null): PantryItem => ({
  id: `i${++n}`, householdId: 'h', addedBy: 'u', name, brand: null, category, storageZone, quantity: 1, unit: null, remainingPct: 100,
  status: 'sealed', purchaseDate: null, expirationDate: null, notes: null, imageUrl: null, barcode: null, createdAt: '', updatedAt: '',
} as PantryItem);

describe('pantryCategoryOf', () => {
  it('keeps a saved category and guesses the rest', () => {
    expect(pantryCategoryOf(item('Black beans', 'dry', 'Canned & Jarred'))).toBe('Canned & Jarred');
    expect(pantryCategoryOf(item('Spaghetti', 'dry'))).toBe('Grains & Pasta');
    expect(pantryCategoryOf(item('Chicken broth', 'dry'))).toBe('Canned & Jarred');
    expect(pantryCategoryOf(item('Sourdough bread', 'dry'))).toBe('Bread & Bakery');
    expect(pantryCategoryOf(item('Mystery thing', 'frozen'))).toBe('Frozen Meals');
    expect(pantryCategoryOf(item('Mystery thing', 'dry', 'Pantry'))).toBe('Other');
  });
});

describe('pantrySections', () => {
  const totals = aggregatePantryItems([
    item('Spaghetti', 'dry'),
    item('Black beans', 'dry', 'Canned & Jarred'),
    item('Diced tomatoes', 'dry', 'Canned & Jarred'),
    item('Mystery thing', 'dry'),
    item('Milk', 'cool'),
    item('Spinach', 'cool'),
    item('Peas', 'frozen', 'Frozen Vegetables'),
  ]);

  it('groups a zone by category in aisle order, Other last', () => {
    const [dry] = pantrySections(totals, 'dry');
    expect(dry.categories.map((c) => c.category)).toEqual(['Grains & Pasta', 'Canned & Jarred', 'Other']);
    expect(dry.categories[1].totals.map((t) => t.items[0].name)).toEqual(['Black beans', 'Diced tomatoes']);
  });

  it('shows every zone with its categories for All', () => {
    const all = pantrySections(totals);
    expect(all.map((s) => [s.zone, s.count])).toEqual([['dry', 4], ['cool', 2], ['frozen', 1]]);
    expect(all[1].categories.map((c) => c.category)).toEqual(['Produce', 'Dairy']);
  });
});
