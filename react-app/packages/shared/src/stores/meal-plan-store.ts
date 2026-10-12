// Meal plan store — now backed by Supabase/PostgreSQL
// Previously routed through ApiClient → DynamoDB, now uses MealPlanRepository directly

import { createStore } from 'zustand/vanilla';
import type { MealPlanRepository, MealPlanMeal } from '../supabase/meal-plan-repo';
import { addDays, todayISO } from '../utils/dates';
import { nextMealOption, type MealSwapState } from '../models/meal';
import type { IngredientSwap } from '../services/substitutions';
import { ingredientSwapEvent, type SuggestionMeta } from '../models/behavior-event';
import { NO_BEHAVIOR_LOG, type BehaviorLog } from './behavior-log';

export interface MealPlanState {
  meals: Record<string, MealPlanMeal[]>; // keyed by date string (YYYY-MM-DD)
  isLoading: boolean;
  error: string | null;
  selectedDate: string; // YYYY-MM-DD
}

export interface MealPlanActions {
  fetchMealPlan: (startDate: string, endDate: string) => Promise<void>;
  fetchDayMealPlan: (date: string) => Promise<void>;
  /** `meta` records how it was picked (search, suggestion and its rank, typed in) for the behavior log. */
  addMeal: (meal: { title: string; description?: string; date: string; mealType?: string; recipeId?: string }, meta?: SuggestionMeta & { source?: string }) => Promise<void>;
  updateMeal: (mealId: string, updates: { title?: string; description?: string; mealType?: string }) => Promise<void>;
  moveMeal: (mealId: string, newDate: string) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  /** Instantly swap a generated meal to its next saved option (saved in the background). No-op on the last option. */
  swapMeal: (mealId: string) => Promise<void>;
  /** Set a meal's ingredient swaps (shown immediately, saved in the background). */
  /** Every changed ingredient is logged as a swap or undo; `meta` says where and how it was picked. */
  setMealSwaps: (mealId: string, swaps: IngredientSwap[], meta?: SuggestionMeta) => Promise<boolean>;
  /** Show a swap immediately and save it; rolls back if saving fails. */
  /** `reason` is logged: a saved option, or a freshly generated batch. */
  applySwap: (mealId: string, swap: MealSwapState, reason?: 'saved_option' | 'fresh_batch') => Promise<void>;
  addFeedback: (mealId: string, feedback: { rating?: number; comment?: string }) => Promise<void>;
  deleteFeedback: (mealId: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
}

export type MealPlanStore = MealPlanState & MealPlanActions;


export function createMealPlanStore(repo: MealPlanRepository, userId: string, log: BehaviorLog = NO_BEHAVIOR_LOG) {
  return createStore<MealPlanStore>()((set, get) => {
  const findMeal = (mealId: string) => Object.values(get().meals).flat().find((m) => m.id === mealId);
  const mealFields = (m: MealPlanMeal) => ({ mealId: m.id, mealDate: m.date, mealType: m.mealType, recipeId: m.recipeId, recipeTitle: m.title });
  return {
    meals: {},
    isLoading: false,
    error: null,
    selectedDate: todayISO(),

    fetchMealPlan: async (startDate: string, endDate: string) => {
      set({ isLoading: true, error: null });
      try {
        const grouped = await repo.getMealPlan(userId, startDate, endDate);
        // Days with no meals come back missing; clear them so stale meals don't linger
        const range: Record<string, MealPlanMeal[]> = {};
        for (let d = startDate; d <= endDate; d = addDays(d, 1)) range[d] = grouped[d] ?? [];
        set({ meals: { ...get().meals, ...range }, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    fetchDayMealPlan: async (date: string) => {
      set({ isLoading: true, error: null });
      try {
        const dayMeals = await repo.getDayMealPlan(userId, date);
        set({ meals: { ...get().meals, [date]: dayMeals }, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    addMeal: async (meal, meta = {}) => {
      try {
        await repo.addMeal(userId, meal);
        log.track({
          type: 'meal_added',
          surface: meta.surface ?? 'plan',
          mealDate: meal.date,
          mealType: meal.mealType ?? null,
          recipeId: meal.recipeId ?? null,
          recipeTitle: meal.title,
          toText: meal.title,
          toKey: meal.recipeId ?? null,
          suggestionRank: meta.suggestionRank ?? null,
          suggestionCount: meta.suggestionCount ?? null,
          payload: { source: meta.source ?? (meal.recipeId ? 'recipe' : 'typed'), ...(meta.suggestion ? { suggestion: meta.suggestion } : {}) },
        });
        await get().fetchDayMealPlan(meal.date);
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    updateMeal: async (mealId: string, updates) => {
      try {
        await repo.updateMeal(mealId, updates);
        await get().fetchDayMealPlan(get().selectedDate);
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    moveMeal: async (mealId: string, newDate: string) => {
      try {
        const oldDate = get().selectedDate;
        const meal = findMeal(mealId);
        await repo.moveMeal(mealId, userId, newDate);
        if (meal) log.track({ type: 'meal_moved', surface: 'plan', ...mealFields(meal), payload: { fromDate: meal.date, toDate: newDate } });
        // Re-fetch both the old and new date
        await Promise.all([
          get().fetchDayMealPlan(oldDate),
          get().fetchDayMealPlan(newDate),
        ]);
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    deleteMeal: async (mealId: string) => {
      try {
        const meal = findMeal(mealId);
        await repo.deleteMeal(mealId);
        if (meal) {
          log.track({ type: 'meal_removed', surface: 'plan', ...mealFields(meal), fromText: meal.title, fromKey: meal.recipeId, payload: { generated: meal.generated, swaps: meal.ingredientSwaps } });
        }
        await get().fetchDayMealPlan(get().selectedDate);
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    swapMeal: async (mealId: string) => {
      const meal = Object.values(get().meals).flat().find((m) => m.id === mealId);
      if (!meal?.recipeId) return;
      const next = nextMealOption({
        current: { recipeId: meal.recipeId, title: meal.title, description: meal.description },
        alternatives: meal.alternatives,
        seenRecipeIds: meal.seenRecipeIds,
      });
      if (next) await get().applySwap(mealId, next, 'saved_option');
    },

    setMealSwaps: async (mealId, swaps, meta = {}) => {
      const date = Object.keys(get().meals).find((d) => get().meals[d].some((m) => m.id === mealId));
      const before = date ? get().meals[date].find((m) => m.id === mealId) : undefined;
      const put = (m: MealPlanMeal) =>
        date && set((state) => ({ meals: { ...state.meals, [date]: (state.meals[date] ?? []).map((x) => (x.id === mealId ? m : x)) } }));
      if (before) put({ ...before, ingredientSwaps: swaps });
      try {
        await repo.setIngredientSwaps(mealId, swaps);
        if (before) {
          // One event per ingredient that changed
          const was = new Map(before.ingredientSwaps.map((x) => [x.original, x.replacement]));
          const now = new Map(swaps.map((x) => [x.original, x.replacement]));
          for (const [original, replacement] of now) {
            if (was.get(original) !== replacement) log.track(ingredientSwapEvent(before, original, replacement, was.get(original) ?? null, meta));
          }
          for (const [original, previous] of was) {
            if (!now.has(original)) log.track(ingredientSwapEvent(before, original, null, previous, meta));
          }
        }
        return true;
      } catch (err) {
        if (before) put(before);
        set({ error: (err as Error).message });
        return false;
      }
    },

    applySwap: async (mealId, swap, reason = 'saved_option') => {
      const date = Object.keys(get().meals).find((d) => get().meals[d].some((m) => m.id === mealId));
      const meal = date ? get().meals[date].find((m) => m.id === mealId) : undefined;
      if (!date || !meal) return;
      const replace = (m: MealPlanMeal) =>
        set((state) => ({ meals: { ...state.meals, [date]: (state.meals[date] ?? []).map((x) => (x.id === mealId ? m : x)) } }));
      replace({
        ...meal,
        recipeId: swap.current.recipeId,
        title: swap.current.title,
        description: swap.current.description,
        alternatives: swap.alternatives,
        seenRecipeIds: swap.seenRecipeIds,
      });
      try {
        await repo.swapMeal(mealId, swap);
        log.track({
          type: 'meal_shuffled',
          surface: 'plan',
          ...mealFields(meal),
          recipeId: swap.current.recipeId,
          recipeTitle: swap.current.title,
          fromText: meal.title,
          toText: swap.current.title,
          fromKey: meal.recipeId,
          toKey: swap.current.recipeId,
          // What was on offer when they moved on: the ones skipped over are implicit negatives
          payload: { reason, rejectedRecipeId: meal.recipeId, remainingOptions: swap.alternatives.map((a) => a.recipeId), seenRecipeIds: swap.seenRecipeIds },
        });
      } catch (err) {
        replace(meal);
        set({ error: (err as Error).message });
      }
    },

    addFeedback: async (mealId: string, feedback) => {
      try {
        await repo.addMealFeedback(userId, mealId, feedback);
        const meal = findMeal(mealId);
        log.track({ type: 'meal_rated', surface: 'plan', ...(meal ? mealFields(meal) : { mealId }), payload: { rating: feedback.rating ?? null, comment: feedback.comment ?? null } });
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    deleteFeedback: async (mealId: string) => {
      try {
        await repo.deleteMealFeedback(userId, mealId);
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    setSelectedDate: (date: string) => set({ selectedDate: date }),
  };
  });
}
