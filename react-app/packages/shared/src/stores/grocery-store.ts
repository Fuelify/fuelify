// Grocery store: the week's shopping LIST (every ingredient the planned meals
// need, with swaps applied and pantry items flagged) and the store CART (the
// list after analysis: pantry left out, priced, split by store, saved for the
// household so choices stick).
//
// Store APIs are reached through `GroceryApi`, which each app supplies (the
// web app calls its own server routes, which hold the store credentials).

import { createStore, type StoreApi } from 'zustand/vanilla';
import { readGroceryConfig, type GroceryConfig, type GroceryProviderStatus, type GroceryStoreId, type ProductOffer } from '../models/grocery';
import { recommendOffer, summarizeCart, type CartLine, type GroceryCart } from '../models/grocery-cart';
import { describeIngredient, type SuggestionMeta } from '../models/behavior-event';
import { buildPlanList, formatAmounts, ingredientKey, type ListItem } from '../services/ingredients';
import { optimizeBasket } from '../services/basket-optimizer';
import { applySwaps, swapLine, withSwap } from '../services/substitutions';
import type { GroceryRepository } from '../supabase/grocery-repo';
import type { MealPlanRepository } from '../supabase/meal-plan-repo';
import type { PantryRepository } from '../supabase/pantry-repo';
import type { ProfileRepository } from '../supabase/profile-repo';
import type { RecipeRepository } from '../supabase/recipe-repo';
import type { MealPlanStore } from './meal-plan-store';
import type { ShoppingCartStore } from './shopping-cart-store';
import { NO_BEHAVIOR_LOG, type BehaviorLog } from './behavior-log';

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

export interface ShoppingList {
  householdId: string;
  dates: string[];
  items: ListItem[];
  /** Keys the household chose to leave out this week */
  skipped: string[];
  /** Planned meals with no recipe (nothing to list for them) */
  mealsWithoutRecipe: number;
}

export interface GroceryState {
  providers: GroceryProviderStatus | null;
  list: ShoppingList | null;
  cart: GroceryCart | null;
  /** Product search results (cross-store search box) */
  searchResults: ProductOffer[] | null;
  busy: 'list' | 'building' | 'searching' | 'swapping' | null;
  /** Cart line keys being re-searched */
  lineBusy: string[];
  error: string | null;
}

export interface GroceryActions {
  loadProviders: () => Promise<void>;
  /** Load the shopping list for `dates` and the household's saved cart. */
  loadList: (householdId: string, dates: string[]) => Promise<void>;
  /** Leave an item out of (or back into) this week's cart. */
  toggleSkip: (key: string) => Promise<void>;
  /**
   * Use something else for a list item (e.g. ground beef → ground turkey): saved
   * as a swap on every planned meal that uses it, keeping each meal's amount.
   */
  swapListItem: (item: ListItem, replacementName: string, meta?: SuggestionMeta) => Promise<boolean>;
  /** Undo swaps on a list item, back to each recipe's original. */
  unswapListItem: (item: ListItem) => Promise<boolean>;
  /** Build (or rebuild) the store cart from the list: price everything, choose stores. Keeps the user's own picks. */
  buildCart: () => Promise<GroceryCart | null>;
  /** Put a specific product in the cart for a line (null clears it). */
  chooseOffer: (key: string, offer: ProductOffer | null) => Promise<void>;
  /** Search the user's stores for a line (e.g. "pepper jack cheese"); results join its options. */
  searchLine: (key: string, query: string) => Promise<ProductOffer[]>;
  /** Change what a cart line is for (and its meals), then pick the best product for it. */
  swapCartLine: (key: string, replacementName: string, meta?: SuggestionMeta) => Promise<void>;
  removeLine: (key: string) => Promise<void>;
  clearCart: () => Promise<void>;
  /** Search one product across all the user's stores. */
  searchProducts: (query: string) => Promise<void>;
  /** Link that opens these items at the store; null on failure (see `error`). */
  checkout: (store: GroceryStoreId, items: CheckoutItem[]) => Promise<string | null>;
  /** The recommended option for a line given the rest of the cart and the user's settings. */
  recommend: (key: string, options: ProductOffer[]) => Promise<ProductOffer | null>;
}

export type GroceryStore = GroceryState & GroceryActions;

export interface GroceryDeps {
  api: GroceryApi;
  profiles: ProfileRepository;
  meals: MealPlanRepository;
  recipes: RecipeRepository;
  pantry: PantryRepository;
  grocery: GroceryRepository;
  cartStore: StoreApi<ShoppingCartStore>;
  mealPlanStore: StoreApi<MealPlanStore>;
  /** Records skips, product picks, swaps and checkouts */
  log?: BehaviorLog;
}

/** A big week's list is ~100 items */
const MAX_PRICED_ITEMS = 150;
const BATCH_SIZE = 20;
const PARALLEL_BATCHES = 2;

export function createGroceryStore(deps: GroceryDeps, userId: string) {
  const config = async () => readGroceryConfig(await deps.profiles.getProfile(userId));
  const log = deps.log ?? NO_BEHAVIOR_LOG;

  return createStore<GroceryStore>()((set, get) => {
    const saveCart = async (cart: GroceryCart | null) => {
      const list = get().list;
      set({ cart });
      if (list) await deps.grocery.save(list.householdId, userId, { cart }).catch((err: Error) => set({ error: err.message }));
    };

    const updateLine = (key: string, change: (line: CartLine) => CartLine | null) => {
      const cart = get().cart;
      if (!cart) return null;
      const lines = cart.lines.map((l) => (l.key === key ? change(l) : l)).filter((l): l is CartLine => !!l);
      return { ...cart, lines };
    };

    const searchMany = async (queries: { key: string; query: string }[], cfg: GroceryConfig) => {
      const offers: Record<string, ProductOffer[]> = {};
      const batches: (typeof queries)[] = [];
      for (let i = 0; i < queries.length; i += BATCH_SIZE) batches.push(queries.slice(i, i + BATCH_SIZE));
      for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
        const results = await Promise.all(batches.slice(i, i + PARALLEL_BATCHES).map((b) => deps.api.search(b, cfg)));
        for (const r of results) Object.assign(offers, r);
      }
      return offers;
    };

    /** Swap every source line of a list item to `replacementName` (or back, when null). */
    const applyToMeals = async (item: ListItem, replacementName: string | null, meta: SuggestionMeta = {}) => {
      const plan = deps.mealPlanStore.getState();
      const meals = Object.values(plan.meals).flat();
      const byMeal = new Map<string, typeof item.sources>();
      for (const s of item.sources) byMeal.set(s.mealId, [...(byMeal.get(s.mealId) ?? []), s]);
      const results = await Promise.all(
        [...byMeal.entries()].map(([mealId, sources]) => {
          let swaps = meals.find((m) => m.id === mealId)?.ingredientSwaps ?? [];
          for (const s of sources) swaps = withSwap(swaps, s.original, replacementName ? swapLine(s.original, replacementName) : null);
          return plan.setMealSwaps(mealId, swaps, meta);
        }),
      );
      return results.every(Boolean);
    };

    return {
      providers: null,
      list: null,
      cart: null,
      searchResults: null,
      busy: null,
      lineBusy: [],
      error: null,

      loadProviders: async () => {
        try {
          set({ providers: await deps.api.status() });
        } catch {
          set({ providers: { kroger: false, walmart: false, instacart: false } });
        }
      },

      loadList: async (householdId, dates) => {
        if (dates.length === 0) return;
        const sorted = [...dates].sort();
        set({ busy: 'list', error: null });
        try {
          const [, catalog, pantry, saved] = await Promise.all([
            // Through the meal plan store, so swaps made elsewhere show up and stay in sync
            deps.mealPlanStore.getState().fetchMealPlan(sorted[0], sorted[sorted.length - 1]),
            deps.recipes.listAllRecipes(),
            deps.pantry.getItems(householdId),
            deps.grocery.get(householdId),
          ]);
          const recipesById = new Map(catalog.map((r) => [r.id, r]));
          const meals = sorted.flatMap((d) => deps.mealPlanStore.getState().meals[d] ?? []);
          const withRecipe = meals.flatMap((m) => {
            const recipe = m.recipeId ? recipesById.get(m.recipeId) : undefined;
            if (!recipe) return [];
            const swapped = applySwaps(recipe.ingredients, m.ingredientSwaps);
            return [{ mealId: m.id, title: recipe.title, lines: recipe.ingredients.map((original, i) => ({ original, line: swapped[i] })) }];
          });
          const items = buildPlanList(withRecipe, pantry.filter((i) => i.status !== 'expired').map((i) => i.name));
          set({
            list: { householdId, dates: sorted, items, skipped: saved.skippedKeys, mealsWithoutRecipe: meals.length - withRecipe.length },
            cart: saved.cart,
            busy: null,
          });
        } catch (err) {
          set({ busy: null, error: (err as Error).message });
        }
      },

      toggleSkip: async (key) => {
        const list = get().list;
        if (!list) return;
        const skipped = list.skipped.includes(key) ? list.skipped.filter((k) => k !== key) : [...list.skipped, key];
        set({ list: { ...list, skipped } });
        const item = list.items.find((i) => i.key === key);
        log.track({
          type: skipped.includes(key) ? 'list_item_skipped' : 'list_item_unskipped',
          surface: 'list',
          householdId: list.householdId,
          fromText: item?.name ?? key,
          fromKey: key,
          fromCategory: item?.category ?? describeIngredient(key).category,
          payload: { dates: list.dates, amounts: item?.amounts ?? [], recipes: item?.recipes ?? [], mealIds: item?.sources.map((x) => x.mealId) ?? [] },
        });
        await deps.grocery.save(list.householdId, userId, { skippedKeys: skipped }).catch((err: Error) => set({ error: err.message }));
      },

      swapListItem: async (item, replacementName, meta = {}) => {
        const list = get().list;
        if (!list || !replacementName.trim()) return false;
        set({ busy: 'swapping', error: null });
        const ok = await applyToMeals(item, replacementName.trim(), { surface: 'list', ...meta });
        set({ busy: null });
        await get().loadList(list.householdId, list.dates);
        return ok;
      },

      unswapListItem: async (item) => {
        const list = get().list;
        if (!list) return false;
        set({ busy: 'swapping', error: null });
        const ok = await applyToMeals(item, null, { surface: 'list' });
        set({ busy: null });
        await get().loadList(list.householdId, list.dates);
        return ok;
      },

      buildCart: async () => {
        const list = get().list;
        if (!list) return null;
        set({ busy: 'building', error: null });
        try {
          const cfg = await config();
          const extras = deps.cartStore.getState().items.filter((i) => !i.checked);
          const wanted = [
            ...list.items
              .filter((i) => !i.inPantry && !list.skipped.includes(i.key))
              .map((i) => ({ key: i.key, name: i.name, amount: formatAmounts(i.amounts), recipes: i.recipes })),
            ...extras
              .map((e) => ({ key: ingredientKey(e.name), name: e.name, amount: e.unit ? `${e.quantity} ${e.unit}` : e.quantity !== 1 ? `×${e.quantity}` : '', recipes: [] as string[] }))
              .filter((e) => e.key),
          ];
          // One line per item (an extra the plan also needs merges into it)
          const unique = [...new Map(wanted.map((w) => [w.key, w])).values()].slice(0, MAX_PRICED_ITEMS);
          const previous = new Map((get().cart?.lines ?? []).map((l) => [l.key, l]));
          const toPrice = unique.filter((u) => previous.get(u.key)?.chosenBy !== 'user');
          const offers = await searchMany(toPrice.map((u) => ({ key: u.key, query: u.name })), cfg);
          const basket = optimizeBasket(toPrice.map((u) => ({ key: u.key, name: u.name })), offers, cfg);
          const picked = new Map(basket.stores.flatMap((s) => s.picks.map((p) => [p.item.key, p.offer] as const)));
          const lines: CartLine[] = unique.map((u) => {
            const prev = previous.get(u.key);
            if (prev?.chosenBy === 'user') return { ...prev, amount: u.amount, recipes: u.recipes };
            return { key: u.key, name: u.name, amount: u.amount, recipes: u.recipes, options: offers[u.key] ?? [], choice: picked.get(u.key) ?? null, chosenBy: 'auto' };
          });
          const cart: GroceryCart = { generatedAt: new Date().toISOString(), dates: list.dates, lines };
          await saveCart(cart);
          const summary = summarizeCart(cart);
          log.track({
            type: 'cart_built',
            surface: 'cart',
            householdId: list.householdId,
            price: summary.total,
            payload: {
              dates: list.dates,
              strategy: cfg.strategy,
              maxStores: cfg.maxStores,
              lines: lines.length,
              keptUserPicks: lines.filter((l) => l.chosenBy === 'user').length,
              notFound: summary.missing.map((l) => l.key),
              stores: summary.stores.map((g) => ({ store: g.store, items: g.lines.length, subtotal: g.subtotal })),
              dealSavings: summary.dealSavings,
            },
          });
          set({ busy: null });
          return cart;
        } catch (err) {
          set({ busy: null, error: (err as Error).message });
          return null;
        }
      },

      chooseOffer: async (key, offer) => {
        const before = get().cart;
        const line = before?.lines.find((l) => l.key === key);
        const cart = updateLine(key, (l) => ({ ...l, choice: offer, chosenBy: 'user', options: offer && !l.options.some((o) => o.store === offer.store && o.productId === offer.productId) ? [offer, ...l.options] : l.options }));
        if (cart) await saveCart(cart);
        if (line) {
          const best = recommendOffer(line.options, before, await config().catch(() => null) ?? readGroceryConfig(null), key);
          const same = (a: ProductOffer | null | undefined, b: ProductOffer | null | undefined) => !!a && !!b && a.store === b.store && a.productId === b.productId;
          const { category } = describeIngredient(line.name);
          log.track({
            type: 'cart_product_chosen',
            surface: 'cart',
            householdId: get().list?.householdId ?? null,
            fromText: line.name,
            fromKey: key,
            fromCategory: category,
            store: offer?.store ?? null,
            productId: offer?.productId ?? null,
            productName: offer?.name ?? null,
            price: offer ? (offer.promoPrice ?? offer.price) : null,
            recommended: offer ? same(offer, best) : null,
            // Rank by price among the options shown (0 = cheapest)
            suggestionRank: offer ? [...line.options].sort((x, y) => (x.promoPrice ?? x.price) - (y.promoPrice ?? y.price)).findIndex((o) => same(o, offer)) : null,
            suggestionCount: line.options.length,
            payload: {
              previous: line.choice ? { store: line.choice.store, productId: line.choice.productId, name: line.choice.name, price: line.choice.promoPrice ?? line.choice.price, chosenBy: line.chosenBy } : null,
              recommendedOffer: best ? { store: best.store, productId: best.productId, name: best.name, price: best.promoPrice ?? best.price } : null,
              organic: offer?.organic ?? null,
              storeBrand: offer?.storeBrand ?? null,
              brand: offer?.brand ?? null,
            },
          });
        }
      },

      searchLine: async (key, query) => {
        if (!query.trim()) return [];
        set((s) => ({ lineBusy: [...s.lineBusy, key], error: null }));
        try {
          const found = (await deps.api.search([{ key, query: query.trim() }], await config()))[key] ?? [];
          log.track({ type: 'product_searched', surface: 'cart', householdId: get().list?.householdId ?? null, fromKey: key, toText: query.trim(), payload: { results: found.length } });
          const cart = updateLine(key, (l) => {
            const seen = new Set(l.options.map((o) => `${o.store}:${o.productId}`));
            return { ...l, options: [...l.options, ...found.filter((o) => !seen.has(`${o.store}:${o.productId}`))] };
          });
          if (cart) await saveCart(cart);
          return found;
        } catch (err) {
          set({ error: (err as Error).message });
          return [];
        } finally {
          set((s) => ({ lineBusy: s.lineBusy.filter((k) => k !== key) }));
        }
      },

      swapCartLine: async (key, replacementName, meta = {}) => {
        const name = replacementName.trim();
        if (!name) return;
        const newKey = ingredientKey(name);
        // Meals first, so the list agrees
        const item = get().list?.items.find((i) => i.key === key);
        if (item) await applyToMeals(item, name, { surface: 'cart', ...meta });
        set((s) => ({ lineBusy: [...s.lineBusy, newKey] }));
        try {
          const cfg = await config();
          const found = (await deps.api.search([{ key: newKey, query: name }], cfg))[newKey] ?? [];
          const best = recommendOffer(found, get().cart, cfg, key);
          const cart = updateLine(key, (l) => ({ ...l, key: newKey, name, options: found, choice: best, chosenBy: 'auto' }));
          if (cart) await saveCart(cart);
        } catch (err) {
          set({ error: (err as Error).message });
        } finally {
          set((s) => ({ lineBusy: s.lineBusy.filter((k) => k !== newKey) }));
        }
        const list = get().list;
        if (list) await get().loadList(list.householdId, list.dates);
      },

      removeLine: async (key) => {
        const line = get().cart?.lines.find((l) => l.key === key);
        const cart = updateLine(key, () => null);
        if (cart) await saveCart(cart);
        if (line) {
          log.track({
            type: 'cart_line_removed',
            surface: 'cart',
            householdId: get().list?.householdId ?? null,
            fromText: line.name,
            fromKey: key,
            fromCategory: describeIngredient(line.name).category,
            store: line.choice?.store ?? null,
            productId: line.choice?.productId ?? null,
            productName: line.choice?.name ?? null,
            price: line.choice ? (line.choice.promoPrice ?? line.choice.price) : null,
            payload: { recipes: line.recipes, amount: line.amount },
          });
        }
      },

      clearCart: async () => {
        const cart = get().cart;
        await saveCart(null);
        if (cart) log.track({ type: 'cart_cleared', surface: 'cart', householdId: get().list?.householdId ?? null, price: summarizeCart(cart).total, payload: { lines: cart.lines.length } });
      },

      searchProducts: async (query) => {
        if (!query.trim()) return;
        set({ busy: 'searching', error: null, searchResults: null });
        try {
          const offers = await deps.api.search([{ key: 'q', query: query.trim() }], await config());
          log.track({ type: 'product_searched', surface: 'search', householdId: get().list?.householdId ?? null, toText: query.trim(), payload: { results: offers.q?.length ?? 0 } });
          set({ searchResults: (offers.q ?? []).sort((a, b) => (a.promoPrice ?? a.price) - (b.promoPrice ?? b.price)), busy: null });
        } catch (err) {
          set({ busy: null, error: (err as Error).message });
        }
      },

      checkout: async (store, items) => {
        set({ error: null });
        try {
          const url = await deps.api.checkout(store, items, await config());
          log.track({
            type: 'cart_checkout_started',
            surface: 'cart',
            householdId: get().list?.householdId ?? null,
            store,
            payload: { items: items.map((i) => ({ name: i.name, quantity: i.quantity, productId: i.productId ?? null })) },
          });
          return url;
        } catch (err) {
          set({ error: (err as Error).message });
          return null;
        }
      },

      recommend: async (key, options) => recommendOffer(options, get().cart, await config(), key),
    };
  });
}
