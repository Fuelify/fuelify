import { describe, expect, it, vi } from 'vitest';
import { createPlanGenerationStore, type PlanGenerationDeps } from './plan-generation-store';
import { createMealPlanStore } from './meal-plan-store';
import type { MealPlanMeal, MealPlanRepository } from '../supabase/meal-plan-repo';

const recipe = (id: string, mealTypes: string[]) => ({
  id, title: id, description: '', imageUrl: null, ingredients: [], steps: [], prepTimeMinutes: null, cookTimeMinutes: null,
  servings: null, cuisine: null, dietType: 'Omnivore', calories: null, mealTypes, createdBy: null,
});
const meal = (id: string, mealType: string, generated: boolean, recipeId: string | null = null): MealPlanMeal => ({
  id, title: id, description: '', mealType, sortOrder: 0, date: '2026-10-12', recipeId, generated,
});

function setup(slots: Record<string, boolean> = { breakfast: true, lunch: true, dinner: true, snack: false }) {
  const existing = { '2026-10-12': [meal('my lunch', 'lunch', false), meal('old dinner', 'dinner', true, 'd1')] };
  const meals = {
    getMealPlan: vi.fn(async () => existing),
    deleteGeneratedMeals: vi.fn(async () => undefined),
    addGeneratedMeals: vi.fn(async () => undefined),
  };
  const deps = {
    profiles: { getProfile: vi.fn(async () => ({ diet: 'Omnivore', allergens: [], mealPlanConfig: { slots } })) },
    recipes: {
      listAllRecipes: vi.fn(async () => [recipe('b1', ['breakfast']), recipe('l1', ['lunch']), recipe('d1', ['dinner']), recipe('d2', ['dinner'])]),
      getClassifiedRecipes: vi.fn(async () => []),
    },
    meals,
    pantry: { getItems: vi.fn(async () => []) },
    mealPlanStore: createMealPlanStore(meals as unknown as MealPlanRepository, 'u1'),
  } as unknown as PlanGenerationDeps;
  return { deps, meals, store: createPlanGenerationStore(deps, 'u1') };
}

describe('plan generation store', () => {
  it('replaces generated meals, keeps hand-added ones and refreshes the plan', async () => {
    const { store, meals } = setup();
    expect(await store.getState().generate(['2026-10-12'], 'h1')).toBe(true);

    expect(meals.deleteGeneratedMeals).toHaveBeenCalledWith('u1', ['2026-10-12']);
    const added = (meals.addGeneratedMeals.mock.calls[0] as unknown as [string, { mealType: string; recipeId: string }[]])[1];
    // Lunch was added by hand, so only breakfast and dinner are generated
    expect(added.map((m) => m.mealType)).toEqual(['breakfast', 'dinner']);
    // The dinner being replaced isn't picked again
    expect(added.find((m) => m.mealType === 'dinner')?.recipeId).toBe('d2');
    expect(meals.getMealPlan).toHaveBeenLastCalledWith('u1', '2026-10-12', '2026-10-12');
    expect(store.getState().lastResult).toMatchObject({ added: 2, unfilled: [] });
    expect(store.getState().generatingDates).toEqual([]);
  });

  it('explains when every meal is switched off', async () => {
    const { store, meals } = setup({ breakfast: false, lunch: false, dinner: false, snack: false });
    expect(await store.getState().generate(['2026-10-12'])).toBe(false);
    expect(store.getState().error).toMatch(/Turn on at least one meal/);
    expect(meals.deleteGeneratedMeals).not.toHaveBeenCalled();
  });
});
