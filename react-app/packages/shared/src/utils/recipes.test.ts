import { describe, expect, it } from 'vitest';
import type { Recipe, RecipeClassification } from '../supabase/recipe-repo';
import { buildDiscoverDeck, filterRecipes, isCompatibleWithDiet, savedRecipes, totalTimeMinutes, formatMinutes } from './recipes';

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

describe('filterRecipes', () => {
  const r = (title: string, mealTypes: string[], extra: Partial<Recipe> = {}) =>
    ({ id: title, title, description: '', imageUrl: null, ingredients: [], steps: [], prepTimeMinutes: null, cookTimeMinutes: null, servings: null, cuisine: null, dietType: null, calories: null, mealTypes, createdBy: null, ...extra }) as Recipe;
  const catalog = [
    r('Greek Chicken Bowls', ['dinner', 'lunch'], { ingredients: ['2 chicken breasts', '1 lemon'] }),
    r('Avocado Toast', ['breakfast', 'lunch', 'dinner']),
    r('Lemon Herb Baked Cod', ['dinner', 'lunch'], { cuisine: 'Mediterranean' }),
    r('Banana Oat Pancakes', ['breakfast']),
  ];

  it('keeps only recipes that fit the meal, preferred slot first', () => {
    expect(filterRecipes(catalog, '', { mealType: 'dinner' }).map((x) => x.id)).toEqual(['Greek Chicken Bowls', 'Lemon Herb Baked Cod', 'Avocado Toast']);
    expect(filterRecipes(catalog, '', { mealType: 'breakfast' }).map((x) => x.id)).toEqual(['Avocado Toast', 'Banana Oat Pancakes']);
  });

  it('matches every word anywhere, ranking title matches first', () => {
    expect(filterRecipes(catalog, 'lemon').map((x) => x.id)).toEqual(['Lemon Herb Baked Cod', 'Greek Chicken Bowls']);
    expect(filterRecipes(catalog, 'mediterranean cod').map((x) => x.id)).toEqual(['Lemon Herb Baked Cod']);
    expect(filterRecipes(catalog, 'pizza')).toEqual([]);
  });

  it('puts recipes that fit the diet first', () => {
    const withDiets = [r('Cod Tacos', ['dinner'], { dietType: 'Pescatarian' }), r('Bean Tacos', ['dinner'], { dietType: 'Vegan' })];
    expect(filterRecipes(withDiets, 'tacos', { diet: 'Vegetarian' }).map((x) => x.id)).toEqual(['Bean Tacos', 'Cod Tacos']);
  });
});

describe('formatMinutes', () => {
  it('reads like a recipe card', () => {
    expect(formatMinutes(10)).toBe('10 min');
    expect(formatMinutes(60)).toBe('1 hr');
    expect(formatMinutes(75)).toBe('1 hr 15 min');
    expect(formatMinutes(0)).toBeNull();
    expect(formatMinutes(null)).toBeNull();
  });
});
