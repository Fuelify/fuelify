import { describe, expect, it, vi } from 'vitest';
import { createGroceryStore, type GroceryApi, type GroceryDeps } from './grocery-store';
import { createShoppingCartStore } from './shopping-cart-store';
import type { ShoppingCartRepository } from '../supabase/shopping-cart-repo';
import type { ProductOffer } from '../models/grocery';

const recipe = (id: string, title: string, ingredients: string[]) => ({ id, title, ingredients });
const meal = (date: string, recipeId: string | null) => ({ id: `${date}-${recipeId}`, date, recipeId, title: '', description: '', mealType: 'dinner', sortOrder: 0, generated: true, alternatives: [], seenRecipeIds: [] });
const offer = (store: ProductOffer['store'], name: string, price: number): ProductOffer => ({ store, productId: `${store}:${name}`, name, brand: null, size: null, price, promoPrice: null, imageUrl: null, url: null, inStock: true, organic: false, storeBrand: false });

function setup() {
  const cartRepo = {
    getItems: vi.fn(async () => [{ id: 'c1', name: 'Onions', checked: false }]),
    addItem: vi.fn(async (_h: string, _u: string, item: { name: string }) => ({ id: item.name, ...item, checked: false })),
  };
  const cartStore = createShoppingCartStore(cartRepo as unknown as ShoppingCartRepository, 'u1');
  const api: GroceryApi = {
    status: vi.fn(async () => ({ kroger: true, walmart: true, instacart: false })),
    search: vi.fn(async (queries) => Object.fromEntries(queries.map((q) => [q.key, [offer('kroger', q.query, 3), offer('walmart', q.query, 2)]]))),
    checkout: vi.fn(async () => 'https://example.com/cart'),
  };
  const deps = {
    api,
    profiles: { getProfile: vi.fn(async () => ({ groceryConfig: { strategy: 'cheapest', maxStores: 2 } })) },
    meals: { getMealPlan: vi.fn(async () => ({ '2026-10-12': [meal('2026-10-12', 'r1'), meal('2026-10-12', null)], '2026-10-13': [meal('2026-10-13', 'r2')] })) },
    recipes: { listAllRecipes: vi.fn(async () => [recipe('r1', 'Taco Pasta', ['1 lb ground beef', '1 onion', '1 cup cheddar cheese']), recipe('r2', 'Chili', ['1 lb ground beef', '1 can kidney beans'])]) },
    pantry: { getItems: vi.fn(async () => [{ name: 'Cheddar cheese', status: 'open' }]) },
    cartStore,
  } as unknown as GroceryDeps;
  return { store: createGroceryStore(deps, 'u1'), cartStore, cartRepo, api };
}

describe('grocery store', () => {
  it('builds a list from the plan, skipping pantry items and what is already in the cart', async () => {
    const { store, cartStore } = setup();
    await cartStore.getState().fetchItems('h1');
    const preview = await store.getState().previewFromPlan(['2026-10-13', '2026-10-12'], 'h1');
    expect(preview?.needs.map((n) => n.key)).toEqual(['kidney bean', 'ground beef']);
    expect(preview?.needs.find((n) => n.key === 'ground beef')?.amounts).toEqual([{ quantity: 2, unit: 'lb' }]);
    expect(preview?.inPantry).toEqual(['cheddar cheese']);
    expect(preview?.alreadyInCart).toEqual(['onion']);
    expect(preview?.mealsWithoutRecipe).toBe(1);
  });

  it('adds the list to the cart with amounts and recipes as notes', async () => {
    const { store, cartRepo } = setup();
    await store.getState().previewFromPlan(['2026-10-12', '2026-10-13'], 'h1');
    expect(await store.getState().addPreviewToCart('h1')).toBe(3);
    expect(cartRepo.addItem).toHaveBeenCalledWith('h1', 'u1', expect.objectContaining({ name: 'ground beef', category: 'Meat & Seafood', notes: '2 lb · for Taco Pasta, Chili' }));
    expect(store.getState().preview).toBeNull();
  });

  it('prices items across stores and picks the cheapest split', async () => {
    const { store, api } = setup();
    const basket = await store.getState().priceBasket([{ key: 'beef', name: 'ground beef' }, { key: 'onion', name: 'onion' }]);
    expect(api.search).toHaveBeenCalledWith([{ key: 'beef', query: 'ground beef' }, { key: 'onion', query: 'onion' }], expect.objectContaining({ strategy: 'cheapest' }));
    expect(basket?.stores.map((s) => s.store)).toEqual(['walmart']);
    expect(basket?.total).toBe(4);
  });

  it('prices long lists in batches', async () => {
    const { store, api } = setup();
    const items = Array.from({ length: 45 }, (_, i) => ({ key: `k${i}`, name: `item ${i}` }));
    const basket = await store.getState().priceBasket(items);
    expect(api.search).toHaveBeenCalledTimes(3);
    expect(basket?.stores[0].picks).toHaveLength(45);
  });
});
