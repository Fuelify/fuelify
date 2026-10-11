// Ported from: lib/models/meal.dart

export interface Meal {
  id: string;
  title: string;
  description: string;
  // Future fields (commented out in Flutter):
  // imageUrl?: string;
  // ingredients?: string[];
  // steps?: string[];
  // date?: string;
}

export function parseMeal(data: Record<string, unknown>): Meal {
  return {
    id: data.id as string,
    title: data.title as string,
    description: data.description as string,
  };
}

export function mealToJSON(meal: Meal): Record<string, unknown> {
  return {
    id: meal.id,
    title: meal.title,
    description: meal.description,
  };
}

// ---------------------------------------------------------------------------
// Meal types (matches the Postgres `meal_type` enum)
// ---------------------------------------------------------------------------

export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '🥪' },
  { value: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]['value'];

export function isMealType(v: string | null | undefined): v is MealType {
  return MEAL_TYPES.some((t) => t.value === v);
}

/** Lenient parse for free-text meal types (e.g. from AI suggestions). */
export function toMealType(v: string | null | undefined): MealType | undefined {
  const lower = v?.toLowerCase();
  return isMealType(lower) ? lower : undefined;
}

/** Order meals breakfast → snack, keeping their sort order within a type. */
export function sortByMealType<T extends { mealType: string; sortOrder?: number }>(meals: T[]): T[] {
  const rank = (t: string) => {
    const i = MEAL_TYPES.findIndex((m) => m.value === t);
    return i < 0 ? MEAL_TYPES.length : i;
  };
  return [...meals].sort((a, b) => rank(a.mealType) - rank(b.mealType) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

// ---------------------------------------------------------------------------
// Swappable options for generated meals
// ---------------------------------------------------------------------------

/** A recipe a generated meal can be swapped to (stored in meals.alternatives). */
export interface MealOption {
  recipeId: string;
  title: string;
  description: string;
}

/** A generated meal's shuffle state: what's showing, what's queued, what's been shown. */
export interface MealSwapState {
  current: MealOption;
  /** Unseen options, best first */
  alternatives: MealOption[];
  /** Recipe ids already shown for this meal */
  seenRecipeIds: string[];
}

/**
 * Move to the next queued option; the current one joins the seen list.
 * Returns null on the last option — time to plan a fresh batch.
 */
export function nextMealOption(state: MealSwapState): MealSwapState | null {
  if (state.alternatives.length === 0) return null;
  const [next, ...rest] = state.alternatives;
  return { current: next, alternatives: rest, seenRecipeIds: [...state.seenRecipeIds, state.current.recipeId] };
}

/** Lenient read of meals.alternatives (JSONB). */
export function readMealOptions(raw: unknown): MealOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is MealOption => typeof o === 'object' && o !== null && typeof o.recipeId === 'string' && typeof o.title === 'string',
  ).map((o) => ({ recipeId: o.recipeId, title: o.title, description: typeof o.description === 'string' ? o.description : '' }));
}
