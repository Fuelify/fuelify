// Plan generation store — runs the meal plan generator against the user's
// data and saves the result. Generated meals are replaced on regenerate;
// meals the user added by hand are never touched.

import { createStore, type StoreApi } from 'zustand/vanilla';
import { enabledSlots, readMealPlanConfig } from '../models/meal-plan-config';
import { isMealType, type MealOption, type MealType } from '../models/meal';
import { generateMealPlan, type PlannerRecipe, type PlannerResult } from '../services/plan-generator';
import { addDays } from '../utils/dates';
import type { MealPlanRepository } from '../supabase/meal-plan-repo';
import type { PantryRepository } from '../supabase/pantry-repo';
import type { ProfileRepository } from '../supabase/profile-repo';
import type { RecipeRepository } from '../supabase/recipe-repo';
import type { MealPlanStore } from './meal-plan-store';
import { NO_BEHAVIOR_LOG, type BehaviorLog } from './behavior-log';

export interface PlanGenerationState {
  /** Dates currently being generated, empty when idle */
  generatingDates: string[];
  /** Meals fetching a fresh batch of options */
  shufflingMealIds: string[];
  error: string | null;
  /** Summary of the last run, for a confirmation message */
  lastResult: { dates: string[]; added: number; unfilled: PlannerResult['unfilled']; cleared?: number } | null;
}

export interface PlanGenerationActions {
  /**
   * Fill the enabled meal slots on `dates`, replacing earlier generated meals.
   * `householdId` lets the planner favour what's in the pantry.
   * Resolves true on success; failures are recorded in `error`.
   */
  generate: (dates: string[], householdId?: string | null) => Promise<boolean>;
  /**
   * Swap a generated meal to its next option. Instant while saved options
   * remain; on the last one, plans a fresh batch that skips recipes already shown.
   */
  shuffle: (mealId: string, householdId?: string | null) => Promise<void>;
  /**
   * Personalised picks for one meal (best first), without saving anything.
   * Same rules as generation: diet, allergens, dislikes, favourites, pantry,
   * and recipes already planned nearby go last, as do `skip` (e.g. picks already shown).
   */
  suggest: (
    date: string,
    mealType: MealType,
    options?: { householdId?: string | null; count?: number; skip?: string[] },
  ) => Promise<PlannerRecipe[]>;
  /** Remove generated meals on `dates` (meals the user added stay). Resolves true on success. */
  clearGenerated: (dates: string[]) => Promise<boolean>;
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
  /** Records what was generated (what the household was shown) */
  log?: BehaviorLog;
}

/** Days either side of the generated range whose recipes count as "recent". */
const VARIETY_WINDOW_DAYS = 6;

export function createPlanGenerationStore(deps: PlanGenerationDeps, userId: string) {
  const log = deps.log ?? NO_BEHAVIOR_LOG;
  // Loaded per run (it's small) so recipes the user just imported are included
  const loadCatalog = () => deps.recipes.listAllRecipes();

  /** Everything the planner needs around `first`..`last`, loaded in parallel. */
  async function loadContext(first: string, last: string, householdId?: string | null) {
    const [profile, recipes, classifications, pantryItems, existing] = await Promise.all([
      deps.profiles.getProfile(userId),
      loadCatalog(),
      deps.recipes.getClassifiedRecipes(userId),
      householdId ? deps.pantry.getItems(householdId) : Promise.resolve([]),
      deps.meals.getMealPlan(userId, addDays(first, -VARIETY_WINDOW_DAYS), addDays(last, VARIETY_WINDOW_DAYS)),
    ]);
    const idsBy = (c: string) => classifications.filter((x) => x.classification === c).map((x) => x.recipeId);
    return {
      profile,
      existing,
      base: {
        recipes,
        diet: profile.diet,
        allergens: profile.allergens,
        favorited: idsBy('favorited'),
        liked: idsBy('liked'),
        disliked: idsBy('disliked'),
        pantryNames: pantryItems.filter((i) => i.status !== 'expired').map((i) => i.name),
      },
    };
  }

  const toOption = (r: PlannerRecipe): MealOption => ({ recipeId: r.id, title: r.title, description: r.description });

  return createStore<PlanGenerationStore>()((set, get) => ({
    generatingDates: [],
    shufflingMealIds: [],
    error: null,
    lastResult: null,

    generate: async (dates, householdId) => {
      if (dates.length === 0 || get().generatingDates.length > 0) return false;
      const sorted = [...dates].sort();
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      set({ generatingDates: sorted, error: null, lastResult: null });
      try {
        const { profile, existing, base } = await loadContext(first, last, householdId);
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

        const result = generateMealPlan({ ...base, dates: sorted, slots, occupied, recentRecipeIds });

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
            alternatives: m.alternatives.map(toOption),
          })),
        );
        await deps.mealPlanStore.getState().fetchMealPlan(first, last);
        // What the planner offered, slot by slot: the baseline later shuffles, swaps and removals are measured against
        log.track({
          type: 'meal_plan_generated',
          surface: 'generator',
          householdId: householdId ?? null,
          payload: {
            dates: sorted,
            slots,
            unfilled: result.unfilled,
            meals: result.meals.map((m) => ({ date: m.date, mealType: m.mealType, recipeId: m.recipe.id, alternatives: m.alternatives.map((a) => a.id) })),
          },
        });

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

    shuffle: async (mealId, householdId) => {
      const plan = deps.mealPlanStore.getState();
      const meal = Object.values(plan.meals).flat().find((m) => m.id === mealId);
      if (!meal || !meal.recipeId || get().shufflingMealIds.includes(mealId)) return;

      // Saved options left: instant
      if (meal.alternatives.length > 0) {
        await plan.swapMeal(mealId);
        return;
      }

      // On the last option: plan a fresh batch for this slot, skipping what's been shown
      if (!isMealType(meal.mealType)) return;
      set((s) => ({ shufflingMealIds: [...s.shufflingMealIds, mealId], error: null }));
      try {
        const { existing, base } = await loadContext(meal.date, meal.date, householdId);
        const nearby = Object.values(existing).flat().map((m) => m.recipeId).filter((id): id is string => !!id);
        const seen = [...meal.seenRecipeIds, meal.recipeId];
        const { meals: [fresh] } = generateMealPlan({
          ...base,
          dates: [meal.date],
          slots: [meal.mealType],
          recentRecipeIds: [...nearby, ...seen],
          // Never re-offer the meal that's on screen
          disliked: [...base.disliked, meal.recipeId],
        });
        if (!fresh) throw new Error('No other recipes fit this meal yet.');
        // Once every option has been seen, start the history over
        const exhausted = seen.includes(fresh.recipe.id);
        await deps.mealPlanStore.getState().applySwap(mealId, {
          current: toOption(fresh.recipe),
          alternatives: fresh.alternatives.map(toOption),
          seenRecipeIds: exhausted ? [meal.recipeId] : seen,
        }, 'fresh_batch');
      } catch (err) {
        set({ error: (err as Error).message });
      } finally {
        set((s) => ({ shufflingMealIds: s.shufflingMealIds.filter((id) => id !== mealId) }));
      }
    },

    suggest: async (date, mealType, { householdId, count = 8, skip = [] } = {}) => {
      set({ error: null });
      try {
        const { existing, base } = await loadContext(date, date, householdId);
        const nearby = Object.values(existing).flat().map((m) => m.recipeId).filter((id): id is string => !!id);
        const { meals: [pick] } = generateMealPlan({
          ...base,
          dates: [date],
          slots: [mealType],
          recentRecipeIds: [...nearby, ...skip],
          alternatives: count - 1,
        });
        return pick ? [pick.recipe, ...pick.alternatives] : [];
      } catch (err) {
        set({ error: (err as Error).message });
        return [];
      }
    },

    clearGenerated: async (dates) => {
      if (dates.length === 0 || get().generatingDates.length > 0) return false;
      const sorted = [...dates].sort();
      const targets = new Set(sorted);
      const cleared = Object.entries(deps.mealPlanStore.getState().meals)
        .filter(([date]) => targets.has(date))
        .reduce((n, [, day]) => n + day.filter((m) => m.generated).length, 0);
      set({ generatingDates: sorted, error: null, lastResult: null });
      try {
        const removed = Object.entries(deps.mealPlanStore.getState().meals)
          .filter(([date]) => targets.has(date))
          .flatMap(([, day]) => day.filter((m) => m.generated).map((m) => ({ mealId: m.id, date: m.date, mealType: m.mealType, recipeId: m.recipeId })));
        await deps.meals.deleteGeneratedMeals(userId, sorted);
        log.track({ type: 'meal_plan_cleared', surface: 'plan', payload: { dates: sorted, meals: removed } });
        await deps.mealPlanStore.getState().fetchMealPlan(sorted[0], sorted[sorted.length - 1]);
        set({ generatingDates: [], lastResult: { dates: sorted, added: 0, unfilled: [], cleared } });
        return true;
      } catch (err) {
        set({ generatingDates: [], error: (err as Error).message });
        return false;
      }
    },

    clearResult: () => set({ lastResult: null, error: null }),
  }));
}
