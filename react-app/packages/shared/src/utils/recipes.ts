// Recipe helpers shared by the web and mobile apps.

import type { Recipe, RecipeClassification } from '../supabase/recipe-repo';

/** Diets each preference can eat. Used to surface compatible recipes first. */
export const DIET_COMPATIBILITY: Record<string, string[]> = {
  Vegan: ['Vegan', 'Raw'],
  Raw: ['Raw', 'Vegan'],
  Vegetarian: ['Vegetarian', 'Vegan', 'Raw'],
  Pescatarian: ['Pescatarian', 'Vegetarian', 'Vegan', 'Raw'],
};

export function isCompatibleWithDiet(recipe: Pick<Recipe, 'dietType'>, diet: string | null | undefined): boolean {
  const allowed = diet ? DIET_COMPATIBILITY[diet] : undefined;
  return !allowed || allowed.includes(recipe.dietType ?? '');
}

/**
 * The Discover deck: recipes the user hasn't rated yet, with ones that fit
 * their diet first (stable order otherwise).
 */
export function buildDiscoverDeck(recipes: Recipe[], classifications: RecipeClassification[], diet?: string | null): Recipe[] {
  const rated = new Set(classifications.map((c) => c.recipeId));
  return recipes
    .filter((r) => !rated.has(r.id))
    .map((r, i) => ({ r, i, fit: isCompatibleWithDiet(r, diet) }))
    .sort((a, b) => Number(b.fit) - Number(a.fit) || a.i - b.i)
    .map(({ r }) => r);
}

/** Liked and favorited recipes (favorites first), optionally filtered by kind. */
export function savedRecipes(
  recipes: Recipe[],
  classifications: RecipeClassification[],
  kind: 'all' | 'liked' | 'favorited' = 'all',
): { recipe: Recipe; kind: 'liked' | 'favorited' }[] {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  return classifications
    .filter((c): c is RecipeClassification & { classification: 'liked' | 'favorited' } =>
      c.classification !== 'disliked' && (kind === 'all' || c.classification === kind))
    .sort((a, b) => Number(b.classification === 'favorited') - Number(a.classification === 'favorited'))
    .flatMap((c) => {
      const recipe = byId.get(c.recipeId);
      return recipe ? [{ recipe, kind: c.classification }] : [];
    });
}

export function totalTimeMinutes(recipe: Pick<Recipe, 'prepTimeMinutes' | 'cookTimeMinutes'>): number {
  return (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
}

/**
 * Catalog search for adding a meal. Every word must appear in the title,
 * description, cuisine, diet or ingredients. With `mealType`, only recipes that
 * fit that slot are returned. Title matches rank first, then recipes that fit
 * `diet`, then recipes whose preferred slot is `mealType`, then catalog order.
 */
export function filterRecipes(
  recipes: Recipe[],
  query: string,
  options: { mealType?: string; diet?: string | null } = {},
): Recipe[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const { mealType, diet } = options;
  return recipes
    .filter((r) => !mealType || r.mealTypes.includes(mealType))
    .map((r, i) => {
      const title = r.title.toLowerCase();
      const haystack = [title, r.description, r.cuisine ?? '', r.dietType ?? '', ...r.ingredients].join('\n').toLowerCase();
      return {
        r,
        i,
        match: words.every((w) => haystack.includes(w)),
        inTitle: words.length > 0 && words.every((w) => title.includes(w)),
        preferred: !!mealType && r.mealTypes[0] === mealType,
        fitsDiet: isCompatibleWithDiet(r, diet),
      };
    })
    .filter((x) => x.match)
    .sort(
      (a, b) =>
        Number(b.inTitle) - Number(a.inTitle) || Number(b.fitsDiet) - Number(a.fitsDiet) || Number(b.preferred) - Number(a.preferred) || a.i - b.i,
    )
    .map((x) => x.r);
}
