// Plan generation store — runs the meal plan generator against the user's
// data and saves the result. Generated meals are replaced on regenerate;
// meals the user added by hand are never touched.

import { createStore, type StoreApi } from 'zustand/vanilla';
import { enabledSlots, readMealPlanConfig } from '../models/meal-plan-config';
import { isMealType, type MealType } from '../models/meal';
import { generateMealPlan, type PlannerResult } from '../services/plan-generator';
import { addDays } from '../utils/dates';
import type { MealPlanRepository } from '../supabase/meal-plan-repo';
import type { PantryRepository } from '../supabase/pantry-repo';
import type { ProfileRepository } from '../supabase/profile-repo';
import type { Recipe, RecipeRepository } from '../supabase/recipe-repo';
import type { MealPlanStore } from './meal-plan-store';

export interface PlanGenerationState {
  /** Dates currently being generated, empty when idle */
  generatingDates: string[];
  error: string | null;
  /** Summary of the last run, for a confirmation message */
  lastResult: { dates: string[]; added: number; unfilled: PlannerResult['unfilled'] } | null;
}

export interface PlanGenerationActions {
  /**
   * Fill the enabled meal slots on `dates`, replacing earlier generated meals.
   * `householdId` lets the planner favour what's in the pantry.
   * Resolves true on success; failures are recorded in `error`.
   */
  generate: (dates: string[], householdId?: string | null) => Promise<boolean>;
  clearResult: () => void;
}

export type PlanGenerationStore = PlanGenerationState & PlanGenerationActions;

export interface PlanGenerationDeps {
  profiles: ProfileRepository;
  recipes: RecipeRepository;
  meals: MealPlanRepository;
  pantry: PantryRepository;
  /** Refreshed after saving so the plan view updates */
  mealPlanStore: StoreApi<MealPlanStore>;
}

/** Days either side of the generated range whose recipes count as "recent". */
const VARIETY_WINDOW_DAYS = 6;

export function createPlanGenerationStore(deps: PlanGenerationDeps, userId: string) {
  // The catalog rarely changes; load it once per session
  let catalog: Promise<Recipe[]> | null = null;
  const loadCatalog = () => {
    catalog ??= deps.recipes.listAllRecipes().catch((err) => {
      catalog = null;
      throw err;
    });
    return catalog;
  };

  return createStore<PlanGenerationStore>()((set, get) => ({
    generatingDates: [],
    error: null,
    lastResult: null,

    generate: async (dates, householdId) => {
      if (dates.length === 0 || get().generatingDates.length > 0) return false;
      const sorted = [...dates].sort();
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      set({ generatingDates: sorted, error: null, lastResult: null });
      try {
        const [profile, recipes, classifications, pantryItems, existing] = await Promise.all([
          deps.profiles.getProfile(userId),
          loadCatalog(),
          deps.recipes.getClassifiedRecipes(userId),
          householdId ? deps.pantry.getItems(householdId) : Promise.resolve([]),
          deps.meals.getMealPlan(userId, addDays(first, -VARIETY_WINDOW_DAYS), addDays(last, VARIETY_WINDOW_DAYS)),
        ]);

        const slots = enabledSlots(readMealPlanConfig(profile));
        if (slots.length === 0) throw new Error('Turn on at least one meal in Profile → Meal plan.');

        const targets = new Set(sorted);
        const occupied: Record<string, MealType[]> = {};
        const recentRecipeIds: string[] = [];
        for (const [date, dayMeals] of Object.entries(existing)) {
          for (const m of dayMeals) {
            if (m.recipeId) recentRecipeIds.push(m.recipeId);
            if (targets.has(date) && !m.generated && isMealType(m.mealType)) (occupied[date] ??= []).push(m.mealType);
          }
        }
        const idsBy = (c: string) => classifications.filter((x) => x.classification === c).map((x) => x.recipeId);

        const result = generateMealPlan({
          dates: sorted,
          slots,
          recipes,
          diet: profile.diet,
          allergens: profile.allergens,
          favorited: idsBy('favorited'),
          liked: idsBy('liked'),
          disliked: idsBy('disliked'),
          pantryNames: pantryItems.filter((i) => i.status !== 'expired').map((i) => i.name),
          occupied,
          recentRecipeIds,
        });

        await deps.meals.deleteGeneratedMeals(userId, sorted);
        await deps.meals.addGeneratedMeals(
          userId,
          result.meals.map((m) => ({
            title: m.recipe.title,
            description: m.recipe.description,
            date: m.date,
            mealType: m.mealType,
            recipeId: m.recipe.id,
            sortOrder: 0,
            alternatives: m.alternatives.map((a) => ({ recipeId: a.id, title: a.title, description: a.description })),
          })),
        );
        await deps.mealPlanStore.getState().fetchMealPlan(first, last);

        set({
          generatingDates: [],
          lastResult: { dates: sorted, added: result.meals.length, unfilled: result.unfilled },
        });
        return true;
      } catch (err) {
        set({ generatingDates: [], error: (err as Error).message });
        return false;
      }
    },

    clearResult: () => set({ lastResult: null, error: null }),
  }));
}
