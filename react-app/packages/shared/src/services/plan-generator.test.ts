import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  dietAllows,
  generateMealPlan,
  preferredMealType,
  pantryMatchCount,
  recipeContainsAllergen,
  type PlannerInput,
  type PlannerRecipe,
} from './plan-generator';
import { nextMealOption, readMealOptions } from '../models/meal';
import { DEFAULT_MEAL_PLAN_CONFIG, enabledSlots, readMealPlanConfig } from '../models/meal-plan-config';

// The real Discover catalog, so the tests catch gaps in the seed data too
const CATALOG: PlannerRecipe[] = (
  JSON.parse(readFileSync(new URL('../../../../supabase/seed/recipes.json', import.meta.url), 'utf8')) as Array<{
    title: string; description: string; ingredients: string[]; diet_type: string; meal_types: string[];
  }>
).map((r) => ({ id: r.title, title: r.title, description: r.description, ingredients: r.ingredients, dietType: r.diet_type, mealTypes: r.meal_types }));

const WEEK = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];

/** Deterministic PRNG so runs are repeatable */
function seeded(seed = 42) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

const plan = (overrides: Partial<PlannerInput> = {}) =>
  generateMealPlan({ dates: WEEK, slots: ['breakfast', 'lunch', 'dinner'], recipes: CATALOG, diet: 'Omnivore', allergens: [], random: seeded(), ...overrides });

describe('meal plan config', () => {
  it('defaults to three meals a day with snacks off', () => {
    expect(enabledSlots(DEFAULT_MEAL_PLAN_CONFIG)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(readMealPlanConfig(null)).toEqual(DEFAULT_MEAL_PLAN_CONFIG);
    expect(readMealPlanConfig({ mealPlanConfig: 'junk' })).toEqual(DEFAULT_MEAL_PLAN_CONFIG);
  });

  it('reads saved slots and ignores junk values', () => {
    const config = readMealPlanConfig({ mealPlanConfig: { slots: { breakfast: false, snack: true, lunch: 'yes' } } });
    expect(enabledSlots(config)).toEqual(['lunch', 'dinner', 'snack']);
  });
});

describe('diet and allergen rules', () => {
  it('lets each diet eat only compatible recipes', () => {
    expect(dietAllows('Vegan', 'Vegan')).toBe(true);
    expect(dietAllows('Vegan', 'Vegetarian')).toBe(false);
    expect(dietAllows('Pescatarian', 'Omnivore')).toBe(false);
    expect(dietAllows('Omnivore', 'Raw')).toBe(true);
    expect(dietAllows('Other', 'Omnivore')).toBe(true);
    expect(dietAllows(null, 'Omnivore')).toBe(true);
  });

  it('spots allergens in ingredients without obvious false positives', () => {
    const r = (...ingredients: string[]) => ({ ingredients });
    expect(recipeContainsAllergen(r('2 eggs'), ['Eggs'])).toBe(true);
    expect(recipeContainsAllergen(r('1 eggplant'), ['Eggs'])).toBe(false);
    expect(recipeContainsAllergen(r('2 tbsp peanut butter'), ['Peanuts'])).toBe(true);
    expect(recipeContainsAllergen(r('2 tbsp peanut butter'), ['Dairy (Lactose)'])).toBe(false);
    expect(recipeContainsAllergen(r('1 tbsp butter'), ['Dairy (Lactose)'])).toBe(true);
    expect(recipeContainsAllergen(r('8 flour tortillas'), ['Gluten'])).toBe(true);
    expect(recipeContainsAllergen(r('1 head butter lettuce leaves'), ['Gluten'])).toBe(false);
    expect(recipeContainsAllergen(r('4 salmon fillets'), ['Crustaceans'])).toBe(false);
    expect(recipeContainsAllergen(r('1 lb shrimp'), ['Crustaceans'])).toBe(true);
  });

  it('counts ingredients already in the pantry', () => {
    expect(pantryMatchCount({ ingredients: ['2 cups spinach', '1 lemon', 'Salt'] }, ['Spinach', 'Lemon', 'Rice'])).toBe(2);
    expect(pantryMatchCount({ ingredients: ['1 lemon'] }, ['a'])).toBe(0);
  });
});

describe('generateMealPlan', () => {
  it('fills breakfast, lunch and dinner every day with no repeats in the week', () => {
    const { meals, unfilled } = plan();
    expect(unfilled).toEqual([]);
    expect(meals).toHaveLength(21);
    expect(new Set(meals.map((m) => m.recipe.id)).size).toBe(21);
    for (const m of meals) expect(m.recipe.mealTypes).toContain(m.mealType);
  });

  it('respects diet and allergens across a full week', () => {
    const { meals, unfilled } = plan({ diet: 'Vegan', allergens: ['Peanuts', 'Soy'] });
    expect(meals.length).toBeGreaterThan(0);
    for (const m of meals) {
      expect(['Vegan', 'Raw']).toContain(m.recipe.dietType);
      expect(recipeContainsAllergen(m.recipe, ['Peanuts', 'Soy'])).toBe(false);
    }
    // Repeats are allowed when the catalog runs short, so a full week still gets planned
    expect(unfilled).toEqual([]);
  });

  it('leaves hand-added meals alone and skips disliked recipes', () => {
    const { meals } = plan({ dates: [WEEK[0]], occupied: { [WEEK[0]]: ['lunch'] }, disliked: ['Overnight Oats with Berries'] });
    expect(meals.map((m) => m.mealType)).toEqual(['breakfast', 'dinner']);
    expect(meals.some((m) => m.recipe.id === 'Overnight Oats with Berries')).toBe(false);
  });

  it('adds snacks only when enabled', () => {
    expect(plan({ dates: [WEEK[0]] }).meals.some((m) => m.mealType === 'snack')).toBe(false);
    const withSnacks = plan({ dates: [WEEK[0]], slots: ['breakfast', 'lunch', 'dinner', 'snack'] });
    expect(withSnacks.meals.find((m) => m.mealType === 'snack')?.recipe.mealTypes).toContain('snack');
  });

  it('regenerating a day picks different recipes than the ones it replaces', () => {
    const first = plan({ dates: [WEEK[2]] }).meals.map((m) => m.recipe.id);
    const again = plan({ dates: [WEEK[2]], recentRecipeIds: first, random: seeded(7) }).meals.map((m) => m.recipe.id);
    expect(again.filter((id) => first.includes(id))).toEqual([]);
  });

  it('favours favourites and pantry ingredients', () => {
    const counts = { fav: 0 };
    for (let seed = 1; seed <= 20; seed++) {
      const { meals } = plan({ dates: [WEEK[0]], slots: ['dinner'], favorited: ['Mushroom Risotto'], random: seeded(seed) });
      if (meals[0].recipe.id === 'Mushroom Risotto') counts.fav++;
    }
    // 37 dinner options: chance alone would pick it about once in 20 runs
    expect(counts.fav).toBeGreaterThan(5);
  });

  it('reports slots nothing can fill', () => {
    const { unfilled } = plan({ dates: [WEEK[0]], recipes: CATALOG.filter((r) => !r.mealTypes.includes('breakfast')) });
    expect(unfilled).toEqual([{ date: WEEK[0], mealType: 'breakfast' }]);
  });

  it('keeps ranked backup options for every meal, all valid for the slot and diet', () => {
    const { meals } = plan({ diet: 'Vegetarian', allergens: ['Eggs'] });
    for (const m of meals) {
      expect(m.alternatives).toHaveLength(4);
      const ids = [m.recipe.id, ...m.alternatives.map((a) => a.id)];
      expect(new Set(ids).size).toBe(ids.length);
      for (const a of m.alternatives) {
        expect(a.mealTypes).toContain(m.mealType);
        expect(dietAllows('Vegetarian', a.dietType)).toBe(true);
        expect(recipeContainsAllergen(a, ['Eggs'])).toBe(false);
      }
    }
  });

  it('puts the most preferred recipe first, ahead of its alternatives', () => {
    const { meals } = plan({ dates: [WEEK[0]], slots: ['dinner'], favorited: ['Mushroom Risotto', 'Red Lentil Dal'], random: () => 0.5 });
    expect(meals[0].recipe.id).toMatch(/Mushroom Risotto|Red Lentil Dal/);
    expect(meals[0].alternatives[0].id).toMatch(/Mushroom Risotto|Red Lentil Dal/);
  });
});

describe('preferred meal slots', () => {
  it('fills each slot mostly with recipes that prefer it', () => {
    const { meals } = plan();
    for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
      const inSlot = meals.filter((m) => m.mealType === slot);
      expect(inSlot.filter((m) => preferredMealType(m.recipe) === slot).length).toBeGreaterThanOrEqual(6);
    }
  });

  it('lets a breakfast recipe fill lunch or dinner when it fits there', () => {
    const toast = CATALOG.find((r) => r.id === 'Avocado Toast with Tomatoes')!;
    expect(preferredMealType(toast)).toBe('breakfast');
    const { meals } = plan({ dates: [WEEK[0]], slots: ['dinner'], recipes: [toast] });
    expect(meals[0].recipe.id).toBe(toast.id);
    // But a breakfast-only recipe never lands at dinner
    const pancakes = CATALOG.find((r) => r.id === 'Banana Oat Pancakes')!;
    expect(plan({ dates: [WEEK[0]], slots: ['dinner'], recipes: [pancakes] }).meals).toEqual([]);
  });
});

describe('nextMealOption', () => {
  const o = (id: string) => ({ recipeId: id, title: id, description: '' });
  it('steps through the queued options, remembering what was shown, and stops at the last', () => {
    const second = nextMealOption({ current: o('a'), alternatives: [o('b'), o('c')], seenRecipeIds: [] })!;
    expect(second).toEqual({ current: o('b'), alternatives: [o('c')], seenRecipeIds: ['a'] });
    const last = nextMealOption(second)!;
    expect(last).toEqual({ current: o('c'), alternatives: [], seenRecipeIds: ['a', 'b'] });
    expect(nextMealOption(last)).toBeNull();
  });

  it('reads stored options leniently', () => {
    expect(readMealOptions([o('a'), { title: 'no id' }, 'junk'])).toEqual([o('a')]);
    expect(readMealOptions(null)).toEqual([]);
  });
});

