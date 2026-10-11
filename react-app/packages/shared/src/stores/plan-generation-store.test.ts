import { describe, expect, it, vi } from 'vitest';
import { createPlanGenerationStore, type PlanGenerationDeps } from './plan-generation-store';
import { createMealPlanStore } from './meal-plan-store';
import type { MealPlanMeal, MealPlanRepository } from '../supabase/meal-plan-repo';

const recipe = (id: string, mealTypes: string[]) => ({
  id, title: id, description: '', imageUrl: null, ingredients: [], steps: [], prepTimeMinutes: null, cookTimeMinutes: null,
  servings: null, cuisine: null, dietType: 'Omnivore', calories: null, mealTypes, createdBy: null,
});
const meal = (id: string, mealType: string, generated: boolean, recipeId: string | null = null): MealPlanMeal => ({
  id, title: id, description: '', mealType, sortOrder: 0, date: '2026-10-12', recipeId, generated, alternatives: [], seenRecipeIds: [],
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

  it('saves the other dinner as a swap option', async () => {
    const { store, meals } = setup();
    await store.getState().generate(['2026-10-12']);
    const added = (meals.addGeneratedMeals.mock.calls[0] as unknown as [string, { mealType: string; alternatives: { recipeId: string }[] }[]])[1];
    expect(added.find((m) => m.mealType === 'dinner')?.alternatives.map((a) => a.recipeId)).toEqual(['d1']);
  });

  it('clears generated meals for the given days and keeps hand-added ones', async () => {
    const { store, meals, deps } = setup();
    await deps.mealPlanStore.getState().fetchMealPlan('2026-10-12', '2026-10-12');
    expect(await store.getState().clearGenerated(['2026-10-12'])).toBe(true);
    expect(meals.deleteGeneratedMeals).toHaveBeenCalledWith('u1', ['2026-10-12']);
    expect(meals.addGeneratedMeals).not.toHaveBeenCalled();
    expect(store.getState().lastResult).toMatchObject({ cleared: 1 });
  });

  it('explains when every meal is switched off', async () => {
    const { store, meals } = setup({ breakfast: false, lunch: false, dinner: false, snack: false });
    expect(await store.getState().generate(['2026-10-12'])).toBe(false);
    expect(store.getState().error).toMatch(/Turn on at least one meal/);
    expect(meals.deleteGeneratedMeals).not.toHaveBeenCalled();
  });
});

describe('shuffling a meal', () => {
  const opt = (id: string) => ({ recipeId: id, title: id, description: '' });

  function shuffleSetup(alternatives: ReturnType<typeof opt>[], seenRecipeIds: string[] = [], swapMeal = async () => undefined) {
    const current = { ...meal('m1', 'dinner', true, 'd1'), title: 'd1', alternatives, seenRecipeIds };
    const meals = {
      getDayMealPlan: vi.fn(async () => [current]),
      getMealPlan: vi.fn(async () => ({ '2026-10-12': [current] })),
      swapMeal: vi.fn(swapMeal),
    };
    const mealPlanStore = createMealPlanStore(meals as unknown as MealPlanRepository, 'u1');
    const deps = {
      profiles: { getProfile: vi.fn(async () => ({ diet: 'Omnivore', allergens: [], mealPlanConfig: {} })) },
      recipes: {
        listAllRecipes: vi.fn(async () => ['d1', 'd2', 'd3'].map((id) => recipe(id, ['dinner']))),
        getClassifiedRecipes: vi.fn(async () => []),
      },
      meals,
      pantry: { getItems: vi.fn(async () => []) },
      mealPlanStore,
    } as unknown as PlanGenerationDeps;
    return { store: createPlanGenerationStore(deps, 'u1'), mealPlanStore, meals };
  }
  const shown = (s: ReturnType<typeof shuffleSetup>['mealPlanStore']) => s.getState().meals['2026-10-12'][0];

  it('swaps to the next saved option instantly', async () => {
    const t = shuffleSetup([opt('d2'), opt('d3')]);
    await t.mealPlanStore.getState().fetchDayMealPlan('2026-10-12');
    await t.store.getState().shuffle('m1');
    expect(shown(t.mealPlanStore)).toMatchObject({ recipeId: 'd2', alternatives: [opt('d3')], seenRecipeIds: ['d1'] });
    expect(t.meals.getMealPlan).not.toHaveBeenCalled();
    expect(t.meals.swapMeal).toHaveBeenCalledWith('m1', { current: opt('d2'), alternatives: [opt('d3')], seenRecipeIds: ['d1'] });
  });

  it('on the last option, plans a fresh batch that skips recipes already shown', async () => {
    const t = shuffleSetup([], ['d2']);
    await t.mealPlanStore.getState().fetchDayMealPlan('2026-10-12');
    await t.store.getState().shuffle('m1');
    // d1 is showing and d2 was seen, so d3 comes first
    expect(shown(t.mealPlanStore).recipeId).toBe('d3');
    expect(shown(t.mealPlanStore).seenRecipeIds).toEqual(['d2', 'd1']);
    expect(t.store.getState().shufflingMealIds).toEqual([]);
  });

  it('starts the history over once every recipe has been shown', async () => {
    const t = shuffleSetup([], ['d2', 'd3']);
    await t.mealPlanStore.getState().fetchDayMealPlan('2026-10-12');
    await t.store.getState().shuffle('m1');
    expect(['d2', 'd3']).toContain(shown(t.mealPlanStore).recipeId);
    expect(shown(t.mealPlanStore).seenRecipeIds).toEqual(['d1']);
  });

  it('puts the meal back if saving fails', async () => {
    const t = shuffleSetup([opt('d2')], [], async () => { throw new Error('offline'); });
    await t.mealPlanStore.getState().fetchDayMealPlan('2026-10-12');
    await t.store.getState().shuffle('m1');
    expect(shown(t.mealPlanStore).recipeId).toBe('d1');
    expect(t.mealPlanStore.getState().error).toBe('offline');
  });
});
