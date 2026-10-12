// Behavior events: an append-only history of what a household does with its
// plan, list and cart, stored in `behavior_events` (migration 00015).
//
// The current state lives on the normal tables; these events are the history
// behind it, for traceability and for learning a household's habits (e.g.
// "always swaps ground beef for ground turkey"). Keep events small and typed:
// put what you'll group or filter on in the typed fields, and anything else in
// `payload`. Bump BEHAVIOR_SCHEMA_VERSION when a payload's shape changes.

import { categorizeIngredient, ingredientKey, parseIngredient } from '../services/ingredients';

export const BEHAVIOR_SCHEMA_VERSION = 1;

export type BehaviorEventType =
  | 'ingredient_swapped'
  | 'ingredient_swap_reverted'
  | 'meal_added'
  | 'meal_removed'
  | 'meal_moved'
  | 'meal_shuffled'
  | 'meal_rated'
  | 'meal_plan_generated'
  | 'meal_plan_cleared'
  | 'list_item_skipped'
  | 'list_item_unskipped'
  | 'cart_built'
  | 'cart_product_chosen'
  | 'cart_line_removed'
  | 'cart_cleared'
  | 'product_searched'
  | 'cart_checkout_started';

/** Where in the app it happened */
export type BehaviorSurface = 'plan' | 'recipe' | 'list' | 'cart' | 'search' | 'generator';

/** How a choice was made among suggestions: rank of the one taken (null = typed their own). */
export interface SuggestionMeta {
  surface?: BehaviorSurface;
  suggestionRank?: number | null;
  suggestionCount?: number;
  /** Extra detail about the suggestion taken (e.g. its diet tag) */
  suggestion?: Record<string, unknown>;
}

export interface BehaviorEvent {
  type: BehaviorEventType;
  surface?: BehaviorSurface;
  householdId?: string | null;
  mealId?: string | null;
  mealDate?: string | null;
  mealType?: string | null;
  recipeId?: string | null;
  recipeTitle?: string | null;
  fromText?: string | null;
  toText?: string | null;
  fromKey?: string | null;
  toKey?: string | null;
  fromCategory?: string | null;
  toCategory?: string | null;
  suggestionRank?: number | null;
  suggestionCount?: number | null;
  store?: string | null;
  productId?: string | null;
  productName?: string | null;
  price?: number | null;
  recommended?: boolean | null;
  payload?: Record<string, unknown>;
}

/** Settings in force when the event happened, so a model sees why. */
export interface BehaviorContext {
  diet?: string | null;
  allergens?: string[];
  groceryStrategy?: string;
  maxStores?: number;
  householdPlan?: string | null;
  householdSize?: number;
}

/** Normalized key and aisle for an ingredient line or name ("1 lb ground beef" → ground beef, Meat & Seafood). */
export function describeIngredient(lineOrName: string): { key: string; category: string } {
  const name = parseIngredient(lineOrName).name || lineOrName;
  const key = ingredientKey(name);
  return { key, category: key ? categorizeIngredient(key) : 'Other' };
}

/** An ingredient change on one meal, ready to log. `previous` is the swap it replaces, if any. */
export function ingredientSwapEvent(
  meal: { id: string; date: string; mealType: string; recipeId: string | null; title: string },
  original: string,
  replacement: string | null,
  previous: string | null,
  meta: SuggestionMeta = {},
): BehaviorEvent {
  const from = describeIngredient(original);
  const base = {
    surface: meta.surface,
    mealId: meal.id,
    mealDate: meal.date,
    mealType: meal.mealType,
    recipeId: meal.recipeId,
    recipeTitle: meal.title,
    fromText: original,
    fromKey: from.key,
    fromCategory: from.category,
  };
  if (replacement === null) {
    const undone = previous ? describeIngredient(previous) : null;
    return { ...base, type: 'ingredient_swap_reverted', toText: previous, toKey: undone?.key ?? null, toCategory: undone?.category ?? null };
  }
  const to = describeIngredient(replacement);
  return {
    ...base,
    type: 'ingredient_swapped',
    toText: replacement,
    toKey: to.key,
    toCategory: to.category,
    suggestionRank: meta.suggestionRank ?? null,
    suggestionCount: meta.suggestionCount ?? null,
    payload: { ...(previous ? { replacedSwap: previous } : {}), ...(meta.suggestion ? { suggestion: meta.suggestion } : {}) },
  };
}
