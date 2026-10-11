// Auto-generated meal plans (Premium).
//
// Pure planning logic: given the recipe catalog and what we know about the
// user, choose a recipe for every empty meal slot on the requested days.
// Persistence lives in the plan-generation store so this stays easy to test
// and identical on web and mobile.

import type { MealType } from '../models/meal';

export interface PlannerRecipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  dietType: string | null;
  mealTypes: string[];
}

export interface PlannerInput {
  /** YYYY-MM-DD days to fill */
  dates: string[];
  /** Meal slots to fill each day, in order */
  slots: MealType[];
  recipes: PlannerRecipe[];
  /** profiles.diet */
  diet: string | null;
  /** profiles.allergens */
  allergens: string[];
  /** Recipe ids by the user's Discover swipes */
  favorited?: Iterable<string>;
  liked?: Iterable<string>;
  disliked?: Iterable<string>;
  /** Names of items in the household pantry; recipes using them score higher */
  pantryNames?: string[];
  /** Slots already taken on each date (meals the user added by hand) */
  occupied?: Record<string, MealType[]>;
  /** Recipes already in the plan nearby; avoided so the week has variety */
  recentRecipeIds?: Iterable<string>;
  /** Backup options kept per meal for swapping (default 4) */
  alternatives?: number;
  /** Injectable for deterministic tests. Defaults to Math.random. */
  random?: () => number;
}

export interface PlannedMeal {
  date: string;
  mealType: MealType;
  /** The top-ranked pick */
  recipe: PlannerRecipe;
  /** Next-best picks for the same slot, best first, for instant swapping */
  alternatives: PlannerRecipe[];
}

export interface PlannerResult {
  meals: PlannedMeal[];
  /** Slots no suitable recipe could fill (e.g. no snacks match the diet) */
  unfilled: { date: string; mealType: MealType }[];
}

// ---------------------------------------------------------------------------
// Diet and allergen rules
// ---------------------------------------------------------------------------

/** Recipe diet types each profile diet can eat. Unknown / 'Other' diets eat anything. */
const DIET_COMPATIBILITY: Record<string, readonly string[]> = {
  Omnivore: ['Omnivore', 'Pescatarian', 'Vegetarian', 'Vegan', 'Raw'],
  Pescatarian: ['Pescatarian', 'Vegetarian', 'Vegan', 'Raw'],
  Vegetarian: ['Vegetarian', 'Vegan', 'Raw'],
  Vegan: ['Vegan', 'Raw'],
  Raw: ['Raw'],
};

export function dietAllows(diet: string | null | undefined, recipeDiet: string | null | undefined): boolean {
  const allowed = diet ? DIET_COMPATIBILITY[diet] : undefined;
  if (!allowed) return true;
  return !!recipeDiet && allowed.includes(recipeDiet);
}

/**
 * Ingredient patterns for each onboarding allergen option. Recipes don't carry
 * allergen tags, so this errs on the side of excluding: a false positive just
 * skips a recipe, a false negative could make someone ill.
 */
const ALLERGEN_PATTERNS: Record<string, RegExp> = {
  'Dairy (Lactose)': /\b(milk|cheese|cheddar|parmesan|mozzarella|feta|ricotta|yogurt|cream|tzatziki|ghee|paneer|cottage cheese)\b|(?<!(peanut|almond|nut|cashew) )\bbutter\b/i,
  Gluten: /\b(flour|bread|breadcrumbs?|panko|pasta|spaghetti|orzo|shells|noodles?|couscous|barley|bagels?|tortillas?|pita|flatbread|wraps?|buns?|croutons|soy sauce|teriyaki|sourdough|seitan)\b/i,
  Peanuts: /\bpeanuts?\b/i,
  'Tree Nuts': /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|pine nuts|pesto)\b/i,
  Soy: /\b(soy|soya|tofu|edamame|miso|tempeh|tamari|teriyaki)\b/i,
  Sesame: /\b(sesame|tahini|hummus)\b/i,
  Eggs: /\b(eggs?|mayo|mayonnaise)\b/i,
  Crustaceans: /\b(shrimp|prawns?|crab|lobster|crayfish)\b/i,
  Fish: /\b(fish|salmon|tuna|cod|tilapia|halibut|sardines?|anchov(y|ies)|trout|mackerel|poke)\b/i,
};

export function recipeContainsAllergen(recipe: Pick<PlannerRecipe, 'ingredients'>, allergens: string[]): boolean {
  const text = recipe.ingredients.join('\n');
  return allergens.some((a) => ALLERGEN_PATTERNS[a]?.test(text));
}

/** How many of the recipe's ingredients are already in the pantry. */
export function pantryMatchCount(recipe: Pick<PlannerRecipe, 'ingredients'>, pantryNames: string[]): number {
  const names = pantryNames.map((n) => n.trim().toLowerCase()).filter((n) => n.length >= 3);
  if (names.length === 0) return 0;
  return recipe.ingredients.filter((ing) => {
    const lower = ing.toLowerCase();
    return names.some((n) => lower.includes(n));
  }).length;
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

const SCORE = {
  favorited: 1.5,
  liked: 1,
  pantryPerIngredient: 0.4,
  pantryMax: 1.2,
  /** Up to this much random jitter so plans vary between runs */
  jitter: 1,
} as const;

/** Backup options saved with each generated meal */
export const DEFAULT_ALTERNATIVES = 4;

export function generateMealPlan(input: PlannerInput): PlannerResult {
  const random = input.random ?? Math.random;
  const favorited = new Set(input.favorited ?? []);
  const liked = new Set(input.liked ?? []);
  const disliked = new Set(input.disliked ?? []);
  const used = new Set(input.recentRecipeIds ?? []);
  const pantryNames = input.pantryNames ?? [];
  const alternativeCount = input.alternatives ?? DEFAULT_ALTERNATIVES;

  // Everything the user can and wants to eat, scored once up front
  const eligible = input.recipes
    .filter((r) => !disliked.has(r.id) && dietAllows(input.diet, r.dietType) && !recipeContainsAllergen(r, input.allergens))
    .map((r) => ({
      recipe: r,
      base:
        (favorited.has(r.id) ? SCORE.favorited : liked.has(r.id) ? SCORE.liked : 0) +
        Math.min(SCORE.pantryMax, pantryMatchCount(r, pantryNames) * SCORE.pantryPerIngredient),
    }));

  const meals: PlannedMeal[] = [];
  const unfilled: PlannerResult['unfilled'] = [];

  for (const date of input.dates) {
    const taken = new Set(input.occupied?.[date] ?? []);
    const usedToday = new Set<string>();
    for (const mealType of input.slots) {
      if (taken.has(mealType)) continue;
      const forSlot = eligible.filter((c) => c.recipe.mealTypes.includes(mealType) && !usedToday.has(c.recipe.id));
      if (forSlot.length === 0) {
        unfilled.push({ date, mealType });
        continue;
      }
      // Rank by preference (with jitter for variety). Recipes not yet used nearby
      // come first; repeats are only offered once the catalog runs out.
      const ranked = forSlot
        .map((c) => ({ recipe: c.recipe, fresh: !used.has(c.recipe.id), score: c.base + random() * SCORE.jitter }))
        .sort((a, b) => Number(b.fresh) - Number(a.fresh) || b.score - a.score)
        .map((c) => c.recipe);
      const [best, ...rest] = ranked;
      meals.push({ date, mealType, recipe: best, alternatives: rest.slice(0, alternativeCount) });
      used.add(best.id);
      usedToday.add(best.id);
    }
  }

  return { meals, unfilled };
}
