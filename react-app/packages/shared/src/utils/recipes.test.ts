import { describe, expect, it } from 'vitest';
import type { Recipe, RecipeClassification } from '../supabase/recipe-repo';
import { buildDiscoverDeck, isCompatibleWithDiet, savedRecipes, totalTimeMinutes } from './recipes';

const recipe = (id: string, dietType: string | null, extra: Partial<Recipe> = {}): Recipe => ({
  id, title: id, description: '', imageUrl: null, ingredients: [], steps: [],
  prepTimeMinutes: null, cookTimeMinutes: null, servings: null, cuisine: null, dietType, calories: null, createdBy: null, ...extra,
});
const rated = (recipeId: string, classification: RecipeClassification['classification']): RecipeClassification => ({ id: `c-${recipeId}`, recipeId, classification });

describe('recipes', () => {
  const recipes = [recipe('steak', 'Omnivore'), recipe('curry', 'Vegan'), recipe('salmon', 'Pescatarian'), recipe('salad', 'Vegetarian')];

  it('knows which diets fit a preference', () => {
    expect(isCompatibleWithDiet(recipe('x', 'Vegan'), 'Vegetarian')).toBe(true);
    expect(isCompatibleWithDiet(recipe('x', 'Omnivore'), 'Vegetarian')).toBe(false);
    expect(isCompatibleWithDiet(recipe('x', 'Omnivore'), 'Omnivore')).toBe(true);
    expect(isCompatibleWithDiet(recipe('x', 'Omnivore'), null)).toBe(true);
  });

  it('builds the deck from unrated recipes, compatible ones first, otherwise stable', () => {
    const deck = buildDiscoverDeck(recipes, [rated('curry', 'liked')], 'Vegetarian');
    expect(deck.map((r) => r.id)).toEqual(['salad', 'steak', 'salmon']);
    expect(buildDiscoverDeck(recipes, [], 'Omnivore').map((r) => r.id)).toEqual(['steak', 'curry', 'salmon', 'salad']);
  });

  it('lists saved recipes with favorites first and skips dislikes and unknown ids', () => {
    const classifications = [rated('steak', 'liked'), rated('curry', 'favorited'), rated('salmon', 'disliked'), rated('gone', 'liked')];
    expect(savedRecipes(recipes, classifications).map((s) => [s.recipe.id, s.kind])).toEqual([['curry', 'favorited'], ['steak', 'liked']]);
    expect(savedRecipes(recipes, classifications, 'liked').map((s) => s.recipe.id)).toEqual(['steak']);
  });

  it('sums prep and cook time, treating missing as zero', () => {
    expect(totalTimeMinutes({ prepTimeMinutes: 10, cookTimeMinutes: 25 })).toBe(35);
    expect(totalTimeMinutes({ prepTimeMinutes: null, cookTimeMinutes: 15 })).toBe(15);
  });
});
