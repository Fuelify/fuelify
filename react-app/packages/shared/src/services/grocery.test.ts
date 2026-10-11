import { describe, expect, it } from 'vitest';
import { buildShoppingList, categorizeIngredient, formatAmounts, ingredientKey, parseIngredient } from './ingredients';
import { optimizeBasket } from './basket-optimizer';
import { DEFAULT_GROCERY_CONFIG, readGroceryConfig, type ProductOffer } from '../models/grocery';

describe('parseIngredient', () => {
  it.each([
    ['1 pound ground beef', 1, 'lb', 'ground beef'],
    ['½ cup diced onion', 0.5, 'cup', 'onion'],
    ['1 1/2 cups chicken broth', 1.5, 'cup', 'chicken broth'],
    ['1/4 tsp cayenne', 0.25, 'tsp', 'cayenne'],
    ['2-3 cloves garlic, minced', 3, 'clove', 'garlic'],
    ['1 (10.5 ounce) can condensed cream of mushroom soup', 1, 'can', 'condensed cream of mushroom soup'],
    ['1 (10 ounce) can diced tomatoes and green chiles (such as RO*TEL®)', 1, 'can', 'tomatoes and green chiles'],
    ['6 ounces spaghetti or other pasta', 6, 'oz', 'spaghetti'],
    ['2 large eggs', 2, null, 'eggs'],
    ['Salt and pepper to taste', null, null, 'salt and pepper'],
    ['1 lemon', 1, null, 'lemon'],
  ])('%s', (line, quantity, unit, name) => {
    expect(parseIngredient(line)).toMatchObject({ quantity, unit, name });
  });

  it('builds keys that match across spellings', () => {
    expect(ingredientKey('Onions')).toBe(ingredientKey('onion'));
    expect(ingredientKey('cherry tomatoes')).toBe('cherry tomato');
    expect(ingredientKey('berries')).toBe('berry');
  });

  it('categorizes for the cart', () => {
    expect(categorizeIngredient('ground beef')).toBe('Meat & Seafood');
    expect(categorizeIngredient('onion')).toBe('Produce');
    expect(categorizeIngredient('cheddar cheese')).toBe('Dairy');
    expect(categorizeIngredient('spaghetti')).toBe('Grains & Pasta');
  });
});

describe('buildShoppingList', () => {
  it('combines across recipes, drops staples and skips pantry items', () => {
    const { needs, inPantry } = buildShoppingList(
      [
        { title: 'Taco Pasta', ingredients: ['1 pound ground beef', '½ cup diced onion', '⅔ cup water', '1 cup shredded Cheddar cheese'] },
        { title: 'Chili', ingredients: ['1 lb ground beef', '1 onion, chopped', 'Salt and pepper to taste', '1 can kidney beans'] },
      ],
      ['Cheddar Cheese', 'Rice'],
    );
    const beef = needs.find((n) => n.key === 'ground beef')!;
    expect(beef.amounts).toEqual([{ quantity: 2, unit: 'lb' }]);
    expect(beef.recipes).toEqual(['Taco Pasta', 'Chili']);
    const onion = needs.find((n) => n.key === 'onion')!;
    expect(formatAmounts(onion.amounts)).toBe('0.5 cup + 1');
    expect(needs.some((n) => /water|salt/.test(n.key))).toBe(false);
    expect(inPantry).toEqual(['cheddar cheese']);
    expect(needs.map((n) => n.key)).toContain('kidney bean');
  });
});

const offer = (store: ProductOffer['store'], key: string, price: number, extra: Partial<ProductOffer> = {}): ProductOffer => ({
  store, productId: `${store}-${key}`, name: key, brand: null, size: null, price, promoPrice: null, imageUrl: null, url: null, inStock: true, organic: false, storeBrand: false, ...extra,
});
const items = ['beef', 'onion', 'pasta', 'cheese'].map((key) => ({ key, name: key }));
const offers = {
  beef: [offer('kroger', 'beef', 5.99, { promoPrice: 4.49 }), offer('walmart', 'beef', 5.49)],
  onion: [offer('kroger', 'onion', 1.29), offer('walmart', 'onion', 0.98)],
  pasta: [offer('kroger', 'pasta', 1.5), offer('walmart', 'pasta', 1.24)],
  cheese: [offer('kroger', 'cheese', 3.99), offer('walmart', 'cheese', 2.5)],
};

describe('optimizeBasket', () => {
  it('splits across stores for the lowest price when that is the strategy', () => {
    const r = optimizeBasket(items, offers, { ...DEFAULT_GROCERY_CONFIG, strategy: 'cheapest', maxStores: 2 });
    expect(r.stores.map((s) => s.store).sort()).toEqual(['kroger', 'walmart']);
    expect(r.stores.find((s) => s.store === 'kroger')!.picks.map((p) => p.item.key)).toEqual(['beef']);
    expect(r.total).toBe(9.21);
    expect(r.dealSavings).toBe(1.5);
    expect(r.vsOneStore).toBe(1); // Walmart alone: 10.21 vs 9.21
  });

  it('keeps to one store when asked, picking the cheapest one', () => {
    const r = optimizeBasket(items, offers, { ...DEFAULT_GROCERY_CONFIG, strategy: 'fewest-stores', maxStores: 2 });
    expect(r.stores.map((s) => s.store)).toEqual(['walmart']);
    expect(r.total).toBe(10.21);
    const one = optimizeBasket(items, offers, { ...DEFAULT_GROCERY_CONFIG, strategy: 'cheapest', maxStores: 1 });
    expect(one.stores).toHaveLength(1);
  });

  it('honours organic preference and reports missing items', () => {
    const r = optimizeBasket(
      [...items, { key: 'saffron', name: 'saffron' }],
      { ...offers, onion: [...offers.onion, offer('kroger', 'onion', 1.1, { organic: true })] },
      { ...DEFAULT_GROCERY_CONFIG, strategy: 'cheapest', maxStores: 2, preferOrganic: true },
    );
    expect(r.stores.flatMap((s) => s.picks).find((p) => p.item.key === 'onion')!.offer.organic).toBe(true);
    expect(r.missing.map((m) => m.key)).toEqual(['saffron']);
  });

  it('skips out-of-stock offers and copes with no offers at all', () => {
    const r = optimizeBasket([{ key: 'beef', name: 'beef' }], { beef: [offer('walmart', 'beef', 1, { inStock: false }), offer('kroger', 'beef', 6)] }, DEFAULT_GROCERY_CONFIG);
    expect(r.stores[0].store).toBe('kroger');
    expect(optimizeBasket(items, {}, DEFAULT_GROCERY_CONFIG)).toMatchObject({ stores: [], total: 0, missing: items });
  });
});

describe('grocery config', () => {
  it('reads saved settings and falls back to defaults', () => {
    expect(readGroceryConfig(null)).toEqual(DEFAULT_GROCERY_CONFIG);
    expect(readGroceryConfig({ groceryConfig: { zipCode: '33602', stores: ['walmart', 'bogus'], strategy: 'cheapest', maxStores: 3, preferOrganic: true } })).toMatchObject({
      zipCode: '33602', stores: ['walmart'], strategy: 'cheapest', maxStores: 3, preferOrganic: true, instacartRetailer: 'Publix',
    });
    expect(readGroceryConfig({ groceryConfig: { zipCode: 'abc', maxStores: 9 } })).toMatchObject({ zipCode: null, maxStores: 2 });
  });
});
