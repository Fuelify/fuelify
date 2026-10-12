import { describe, expect, it, vi } from 'vitest';
import { createGroceryStore, type GroceryApi, type GroceryDeps } from './grocery-store';
import { createMealPlanStore } from './meal-plan-store';
import { createShoppingCartStore } from './shopping-cart-store';
import { recommendOffer, summarizeCart, type GroceryCart } from '../models/grocery-cart';
import { DEFAULT_GROCERY_CONFIG, type ProductOffer } from '../models/grocery';
import type { IngredientSwap } from '../services/substitutions';
import type { MealPlanRepository } from '../supabase/meal-plan-repo';
import type { ShoppingCartRepository } from '../supabase/shopping-cart-repo';
import type { BehaviorEvent } from '../models/behavior-event';
import type { BehaviorLog } from './behavior-log';

const recipe = (id: string, title: string, ingredients: string[]) => ({ id, title, ingredients });
const offer = (store: ProductOffer['store'], name: string, price: number, extra: Partial<ProductOffer> = {}): ProductOffer => ({
  store, productId: `${store}:${name}`, name, brand: null, size: null, price, promoPrice: null, imageUrl: null, url: null, inStock: true, organic: false, storeBrand: false, ...extra,
});

function setup() {
  // Meals live in a little fake database so swaps persist across reloads
  const meals = [
    { id: 'm1', date: '2026-10-12', recipe_id: 'r1', ingredient_swaps: [] as IngredientSwap[] },
    { id: 'm2', date: '2026-10-13', recipe_id: 'r2', ingredient_swaps: [] as IngredientSwap[] },
    { id: 'm3', date: '2026-10-13', recipe_id: null, ingredient_swaps: [] as IngredientSwap[] },
  ];
  const toMeal = (m: (typeof meals)[number]) => ({ id: m.id, date: m.date, recipeId: m.recipe_id, title: m.id, description: '', mealType: 'dinner', sortOrder: 0, generated: true, alternatives: [], seenRecipeIds: [], ingredientSwaps: m.ingredient_swaps });
  const mealRepo = {
    getMealPlan: vi.fn(async () => {
      const out: Record<string, ReturnType<typeof toMeal>[]> = {};
      for (const m of meals) (out[m.date] ??= []).push(toMeal(m));
      return out;
    }),
    setIngredientSwaps: vi.fn(async (id: string, swaps: IngredientSwap[]) => {
      meals.find((m) => m.id === id)!.ingredient_swaps = swaps;
    }),
  };
  const saved: { cart: GroceryCart | null; skippedKeys: string[] } = { cart: null, skippedKeys: [] };
  const api: GroceryApi = {
    status: vi.fn(async () => ({ kroger: true, walmart: true, instacart: false })),
    search: vi.fn(async (queries) =>
      Object.fromEntries(queries.map((q) => [q.key, [offer('kroger', q.query, q.query.includes('cheese') ? 2.5 : 4), offer('walmart', q.query, 3)]])),
    ),
    checkout: vi.fn(async () => 'https://example.com'),
  };
  const events: BehaviorEvent[] = [];
  const log: BehaviorLog = { track: (e) => void events.push(e), flush: async () => {} };
  const mealPlanStore = createMealPlanStore(mealRepo as unknown as MealPlanRepository, 'u1', log);
  const cartStore = createShoppingCartStore({ getItems: vi.fn(async () => []) } as unknown as ShoppingCartRepository, 'u1');
  const deps = {
    api,
    profiles: { getProfile: vi.fn(async () => ({ groceryConfig: { strategy: 'balanced', maxStores: 2 } })) },
    meals: mealRepo,
    recipes: { listAllRecipes: vi.fn(async () => [recipe('r1', 'Taco Pasta', ['1 pound ground beef', '1 cup shredded Cheddar cheese', '1 onion']), recipe('r2', 'Chili', ['1 pound ground beef', '1 can kidney beans'])]) },
    pantry: { getItems: vi.fn(async () => [{ name: 'Onion', status: 'open' }]) },
    grocery: {
      get: vi.fn(async () => ({ ...saved })),
      save: vi.fn(async (_h: string, _u: string, u: { cart?: GroceryCart | null; skippedKeys?: string[] }) => {
        if (u.cart !== undefined) saved.cart = u.cart;
        if (u.skippedKeys !== undefined) saved.skippedKeys = u.skippedKeys;
      }),
    },
    cartStore,
    mealPlanStore,
    log,
  } as unknown as GroceryDeps;
  return { store: createGroceryStore(deps, 'u1'), meals, api, saved, events };
}

const WEEK = ['2026-10-12', '2026-10-13'];

describe('shopping list', () => {
  it('lists every ingredient for the week, flags pantry items and tracks sources', async () => {
    const { store } = setup();
    await store.getState().loadList('h1', WEEK);
    const list = store.getState().list!;
    expect(list.items.map((i) => i.key).sort()).toEqual(['cheddar cheese', 'ground beef', 'kidney bean', 'onion']);
    expect(list.items.find((i) => i.key === 'onion')?.inPantry).toBe(true);
    expect(list.items.find((i) => i.key === 'ground beef')?.amounts).toEqual([{ quantity: 2, unit: 'lb' }]);
    expect(list.items.find((i) => i.key === 'ground beef')?.sources.map((s) => s.mealId)).toEqual(['m1', 'm2']);
    expect(list.mealsWithoutRecipe).toBe(1);
  });

  it('swaps an item in every meal that uses it, and can undo it', async () => {
    const { store, meals } = setup();
    await store.getState().loadList('h1', WEEK);
    const beef = store.getState().list!.items.find((i) => i.key === 'ground beef')!;
    expect(await store.getState().swapListItem(beef, 'ground turkey')).toBe(true);
    expect(meals[0].ingredient_swaps).toEqual([{ original: '1 pound ground beef', replacement: '1 pound ground turkey' }]);
    expect(meals[1].ingredient_swaps).toHaveLength(1);
    const turkey = store.getState().list!.items.find((i) => i.key === 'ground turkey')!;
    expect(turkey.amounts).toEqual([{ quantity: 2, unit: 'lb' }]);
    expect(store.getState().list!.items.some((i) => i.key === 'ground beef')).toBe(false);

    await store.getState().unswapListItem(turkey);
    expect(meals[0].ingredient_swaps).toEqual([]);
    expect(store.getState().list!.items.some((i) => i.key === 'ground beef')).toBe(true);
  });

  it('remembers skipped items', async () => {
    const { store, saved } = setup();
    await store.getState().loadList('h1', WEEK);
    await store.getState().toggleSkip('kidney bean');
    expect(saved.skippedKeys).toEqual(['kidney bean']);
  });
});

describe('store cart', () => {
  it('builds from the list without pantry or skipped items, and keeps user picks on rebuild', async () => {
    const { store, saved } = setup();
    await store.getState().loadList('h1', WEEK);
    await store.getState().toggleSkip('kidney bean');
    const cart = (await store.getState().buildCart())!;
    expect(cart.lines.map((l) => l.key).sort()).toEqual(['cheddar cheese', 'ground beef']);
    expect(cart.lines.find((l) => l.key === 'ground beef')).toMatchObject({ amount: '2 lb', recipes: ['Taco Pasta', 'Chili'], chosenBy: 'auto' });
    expect(saved.cart).toEqual(cart);

    const krogerBeef = cart.lines.find((l) => l.key === 'ground beef')!.options.find((o) => o.store === 'kroger')!;
    await store.getState().chooseOffer('ground beef', krogerBeef);
    const rebuilt = (await store.getState().buildCart())!;
    expect(rebuilt.lines.find((l) => l.key === 'ground beef')).toMatchObject({ chosenBy: 'user', choice: { store: 'kroger' } });
  });

  it('swaps a cart line (cheddar → pepper jack), updating its meals and picking the best product', async () => {
    const { store, meals } = setup();
    await store.getState().loadList('h1', WEEK);
    await store.getState().buildCart();
    await store.getState().swapCartLine('cheddar cheese', 'pepper jack cheese');
    const line = store.getState().cart!.lines.find((l) => l.key === 'pepper jack cheese')!;
    expect(line.name).toBe('pepper jack cheese');
    expect(line.choice?.name).toBe('pepper jack cheese');
    expect(meals[0].ingredient_swaps).toEqual([{ original: '1 cup shredded Cheddar cheese', replacement: '1 cup pepper jack cheese' }]);
    expect(store.getState().list!.items.some((i) => i.key === 'pepper jack cheese')).toBe(true);
  });
});

describe('cart helpers', () => {
  const cart: GroceryCart = {
    generatedAt: '', dates: [],
    lines: [
      { key: 'a', name: 'a', amount: '', recipes: [], options: [], choice: offer('walmart', 'a', 3, { promoPrice: 2.5 }), chosenBy: 'auto' },
      { key: 'b', name: 'b', amount: '', recipes: [], options: [], choice: offer('kroger', 'b', 4), chosenBy: 'auto' },
      { key: 'c', name: 'c', amount: '', recipes: [], options: [], choice: null, chosenBy: 'auto' },
    ],
  };

  it('summarizes by store', () => {
    const s = summarizeCart(cart);
    expect(s.stores.map((g) => [g.store, g.subtotal])).toEqual([['walmart', 2.5], ['kroger', 4]]);
    expect(s.missing.map((l) => l.key)).toEqual(['c']);
    expect(s.total).toBe(6.5);
    expect(s.dealSavings).toBe(0.5);
  });

  it('recommends a store already in the cart unless another is clearly cheaper', () => {
    const walmartOnly: GroceryCart = { ...cart, lines: [cart.lines[0]] };
    const options = [offer('walmart', 'x', 3), offer('kroger', 'x', 2)];
    // Balanced: $1 cheaper isn't worth a second store
    expect(recommendOffer(options, walmartOnly, { ...DEFAULT_GROCERY_CONFIG, strategy: 'balanced' })?.store).toBe('walmart');
    // Lowest price: take the cheaper one
    expect(recommendOffer(options, walmartOnly, { ...DEFAULT_GROCERY_CONFIG, strategy: 'cheapest' })?.store).toBe('kroger');
    // One store max: never add another
    expect(recommendOffer([offer('walmart', 'x', 9), offer('kroger', 'x', 1)], walmartOnly, { ...DEFAULT_GROCERY_CONFIG, strategy: 'cheapest', maxStores: 1 })?.store).toBe('walmart');
  });
});

describe('behavior events', () => {
  it('logs one swap per meal with normalized keys, categories and the suggestion taken, and logs the undo', async () => {
    const { store, events } = setup();
    await store.getState().loadList('h1', WEEK);
    const beef = store.getState().list!.items.find((i) => i.key === 'ground beef')!;
    await store.getState().swapListItem(beef, 'ground turkey', { suggestionRank: 0, suggestionCount: 5, suggestion: { diet: 'Omnivore' } });
    const swaps = events.filter((e) => e.type === 'ingredient_swapped');
    expect(swaps.map((e) => e.mealId)).toEqual(['m1', 'm2']);
    expect(swaps[0]).toMatchObject({
      surface: 'list',
      recipeId: 'r1',
      fromText: '1 pound ground beef',
      toText: '1 pound ground turkey',
      fromKey: 'ground beef',
      toKey: 'ground turkey',
      suggestionRank: 0,
      suggestionCount: 5,
    });
    expect(swaps[0].fromCategory).toBe(swaps[0].toCategory);

    const turkey = store.getState().list!.items.find((i) => i.key === 'ground turkey')!;
    await store.getState().unswapListItem(turkey);
    const undo = events.filter((e) => e.type === 'ingredient_swap_reverted');
    expect(undo).toHaveLength(2);
    expect(undo[0]).toMatchObject({ fromKey: 'ground beef', toKey: 'ground turkey', toText: '1 pound ground turkey' });
  });

  it('logs skips, cart builds, product picks against the recommendation, and removals', async () => {
    const { store, events } = setup();
    await store.getState().loadList('h1', WEEK);
    await store.getState().toggleSkip('kidney bean');
    expect(events.at(-1)).toMatchObject({ type: 'list_item_skipped', householdId: 'h1', fromKey: 'kidney bean', payload: { recipes: ['Chili'] } });

    await store.getState().buildCart();
    expect(events.at(-1)).toMatchObject({ type: 'cart_built', payload: { lines: 2, strategy: 'balanced' } });

    const line = store.getState().cart!.lines.find((l) => l.key === 'ground beef')!;
    const kroger = line.options.find((o) => o.store === 'kroger')!;
    await store.getState().chooseOffer('ground beef', kroger);
    // Walmart was the pick ($3 vs $4), so choosing Kroger goes against it
    expect(events.at(-1)).toMatchObject({ type: 'cart_product_chosen', fromKey: 'ground beef', store: 'kroger', price: 4, recommended: false, suggestionRank: 1, payload: { previous: { store: 'walmart' }, recommendedOffer: { store: 'walmart' } } });

    await store.getState().removeLine('cheddar cheese');
    expect(events.at(-1)).toMatchObject({ type: 'cart_line_removed', fromKey: 'cheddar cheese', store: 'walmart' });
  });

  it('logs a cart swap with the cart as its surface', async () => {
    const { store, events } = setup();
    await store.getState().loadList('h1', WEEK);
    await store.getState().buildCart();
    await store.getState().swapCartLine('cheddar cheese', 'pepper jack cheese', { suggestionRank: 0, suggestionCount: 5 });
    expect(events.find((e) => e.type === 'ingredient_swapped')).toMatchObject({ surface: 'cart', fromKey: 'cheddar cheese', toKey: 'pepper jack cheese', mealId: 'm1' });
  });
});
