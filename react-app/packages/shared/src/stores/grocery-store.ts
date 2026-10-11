// Grocery store (Premium): turn the meal plan into a shopping list, price it
// across the user's stores, and search products everywhere at once.
//
// Store APIs are reached through `GroceryApi`, which each app supplies (the
// web app calls its own server routes, which hold the store credentials).

import { createStore, type StoreApi } from 'zustand/vanilla';
import { readGroceryConfig, type GroceryConfig, type GroceryProviderStatus, type GroceryStoreId, type ProductOffer } from '../models/grocery';
import { buildShoppingList, formatAmounts, ingredientKey, type ShoppingNeed } from '../services/ingredients';
import { optimizeBasket, type BasketItem, type OptimizedBasket } from '../services/basket-optimizer';
import type { MealPlanRepository } from '../supabase/meal-plan-repo';
import type { PantryRepository } from '../supabase/pantry-repo';
import type { ProfileRepository } from '../supabase/profile-repo';
import type { RecipeRepository } from '../supabase/recipe-repo';
import type { ShoppingCartStore } from './shopping-cart-store';

export interface GroceryApi {
  /** Which stores are connected on the server */
  status: () => Promise<GroceryProviderStatus>;
  /** Offers per item key from each requested store */
  search: (queries: { key: string; query: string }[], config: GroceryConfig) => Promise<Record<string, ProductOffer[]>>;
  /** A link that opens the basket at the store (cart or shopping list) */
  checkout: (store: GroceryStoreId, items: CheckoutItem[], config: GroceryConfig) => Promise<string>;
}

export interface CheckoutItem {
  name: string;
  quantity: number;
  /** The store's product, when priced there */
  productId?: string;
}

/** For apps without store connections yet (e.g. mobile) */
export const UNAVAILABLE_GROCERY_API: GroceryApi = {
  status: async () => ({ kroger: false, walmart: false, instacart: false }),
  search: async () => {
    throw new Error('Store connections aren’t available in this app yet.');
  },
  checkout: async () => {
    throw new Error('Store connections aren’t available in this app yet.');
  },
};

export interface ListPreview {
  dates: string[];
  needs: ShoppingNeed[];
  /** Ingredients skipped because the pantry has them */
  inPantry: string[];
  /** Planned meals without a recipe (nothing to add for them) */
  mealsWithoutRecipe: number;
  /** Needs already in the cart (not checked off) */
  alreadyInCart: string[];
}

export interface GroceryState {
  providers: GroceryProviderStatus | null;
  preview: ListPreview | null;
  basket: OptimizedBasket | null;
  searchResults: ProductOffer[] | null;
  busy: 'preview' | 'adding' | 'pricing' | 'searching' | null;
  error: string | null;
}

export interface GroceryActions {
  loadProviders: () => Promise<void>;
  /** Shopping list for the planned meals on `dates`, minus pantry and cart. */
  previewFromPlan: (dates: string[], householdId: string | null) => Promise<ListPreview | null>;
  /** Add the previewed needs to the household cart. Resolves to how many were added. */
  addPreviewToCart: (householdId: string) => Promise<number>;
  /** Price these items across the user's stores and choose where to buy what. */
  priceBasket: (items: BasketItem[]) => Promise<OptimizedBasket | null>;
  /** Search one product across all the user's stores. */
  searchProducts: (query: string) => Promise<void>;
  /** Link that opens these items at the store; null on failure (see `error`). */
  checkout: (store: GroceryStoreId, items: CheckoutItem[]) => Promise<string | null>;
  reset: () => void;
}

export type GroceryStore = GroceryState & GroceryActions;

export interface GroceryDeps {
  api: GroceryApi;
  profiles: ProfileRepository;
  meals: MealPlanRepository;
  recipes: RecipeRepository;
  pantry: PantryRepository;
  cartStore: StoreApi<ShoppingCartStore>;
}

/** A big week's list is ~100 items */
const MAX_PRICED_ITEMS = 150;
const BATCH_SIZE = 20;
const PARALLEL_BATCHES = 2;

export function createGroceryStore(deps: GroceryDeps, userId: string) {
  const config = async () => readGroceryConfig(await deps.profiles.getProfile(userId));

  return createStore<GroceryStore>()((set, get) => ({
    providers: null,
    preview: null,
    basket: null,
    searchResults: null,
    busy: null,
    error: null,

    loadProviders: async () => {
      try {
        set({ providers: await deps.api.status() });
      } catch {
        set({ providers: { kroger: false, walmart: false, instacart: false } });
      }
    },

    previewFromPlan: async (dates, householdId) => {
      if (dates.length === 0) return null;
      const sorted = [...dates].sort();
      set({ busy: 'preview', error: null, preview: null });
      try {
        const [byDate, catalog, pantry] = await Promise.all([
          deps.meals.getMealPlan(userId, sorted[0], sorted[sorted.length - 1]),
          deps.recipes.listAllRecipes(),
          householdId ? deps.pantry.getItems(householdId) : Promise.resolve([]),
        ]);
        const recipesById = new Map(catalog.map((r) => [r.id, r]));
        const meals = sorted.flatMap((d) => byDate[d] ?? []);
        const recipes = meals.map((m) => (m.recipeId ? recipesById.get(m.recipeId) : undefined)).filter((r): r is NonNullable<typeof r> => !!r);
        const { needs, inPantry } = buildShoppingList(
          recipes.map((r) => ({ title: r.title, ingredients: r.ingredients })),
          pantry.filter((i) => i.status !== 'expired').map((i) => i.name),
        );
        const inCart = new Set(deps.cartStore.getState().items.filter((i) => !i.checked).map((i) => ingredientKey(i.name)));
        const preview: ListPreview = {
          dates: sorted,
          needs: needs.filter((n) => !inCart.has(n.key)),
          inPantry,
          mealsWithoutRecipe: meals.length - recipes.length,
          alreadyInCart: needs.filter((n) => inCart.has(n.key)).map((n) => n.name),
        };
        set({ preview, busy: null });
        return preview;
      } catch (err) {
        set({ busy: null, error: (err as Error).message });
        return null;
      }
    },

    addPreviewToCart: async (householdId) => {
      const preview = get().preview;
      if (!preview) return 0;
      set({ busy: 'adding', error: null });
      const add = deps.cartStore.getState().addItem;
      let added = 0;
      for (const need of preview.needs) {
        const single = need.amounts.length === 1 ? need.amounts[0] : null;
        await add(householdId, {
          name: need.name,
          quantity: single?.quantity != null && !single.unit ? Math.max(1, Math.ceil(single.quantity)) : 1,
          unit: undefined,
          category: need.category,
          notes: [formatAmounts(need.amounts), `for ${need.recipes.join(', ')}`].filter(Boolean).join(' · '),
        });
        added++;
      }
      set({ busy: null, preview: null });
      return added;
    },

    priceBasket: async (items) => {
      if (items.length === 0) return null;
      set({ busy: 'pricing', error: null, basket: null });
      try {
        const cfg = await config();
        const priced = items.slice(0, MAX_PRICED_ITEMS);
        // Batches keep each server request short (store APIs are called per item)
        const batches: BasketItem[][] = [];
        for (let i = 0; i < priced.length; i += BATCH_SIZE) batches.push(priced.slice(i, i + BATCH_SIZE));
        const offers: Record<string, ProductOffer[]> = {};
        for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
          const results = await Promise.all(
            batches.slice(i, i + PARALLEL_BATCHES).map((b) => deps.api.search(b.map((item) => ({ key: item.key, query: item.name })), cfg)),
          );
          for (const r of results) Object.assign(offers, r);
        }
        const basket = optimizeBasket(priced, offers, cfg);
        set({ basket, busy: null });
        return basket;
      } catch (err) {
        set({ busy: null, error: (err as Error).message });
        return null;
      }
    },

    searchProducts: async (query) => {
      if (!query.trim()) return;
      set({ busy: 'searching', error: null, searchResults: null });
      try {
        const offers = await deps.api.search([{ key: 'q', query: query.trim() }], await config());
        const results = (offers.q ?? []).sort((a, b) => (a.promoPrice ?? a.price) - (b.promoPrice ?? b.price));
        set({ searchResults: results, busy: null });
      } catch (err) {
        set({ busy: null, error: (err as Error).message });
      }
    },

    checkout: async (store, items) => {
      set({ error: null });
      try {
        return await deps.api.checkout(store, items, await config());
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    reset: () => set({ preview: null, basket: null, searchResults: null, error: null }),
  }));
}
