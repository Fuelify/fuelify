// Meal plan store — now backed by Supabase/PostgreSQL
// Previously routed through ApiClient → DynamoDB, now uses MealPlanRepository directly

import { createStore } from 'zustand/vanilla';
import type { MealPlanRepository, MealPlanMeal } from '../supabase/meal-plan-repo';
import { addDays, todayISO } from '../utils/dates';
import { nextMealOption } from '../models/meal';

export interface MealPlanState {
  meals: Record<string, MealPlanMeal[]>; // keyed by date string (YYYY-MM-DD)
  isLoading: boolean;
  error: string | null;
  selectedDate: string; // YYYY-MM-DD
}

export interface MealPlanActions {
  fetchMealPlan: (startDate: string, endDate: string) => Promise<void>;
  fetchDayMealPlan: (date: string) => Promise<void>;
  addMeal: (meal: { title: string; description?: string; date: string; mealType?: string; recipeId?: string }) => Promise<void>;
  updateMeal: (mealId: string, updates: { title?: string; description?: string; mealType?: string }) => Promise<void>;
  moveMeal: (mealId: string, newDate: string) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  /** Instantly swap a generated meal to its next saved option (saved in the background). */
  swapMeal: (mealId: string) => Promise<void>;
  addFeedback: (mealId: string, feedback: { rating?: number; comment?: string }) => Promise<void>;
  deleteFeedback: (mealId: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
}

export type MealPlanStore = MealPlanState & MealPlanActions;


export function createMealPlanStore(repo: MealPlanRepository, userId: string) {
  return createStore<MealPlanStore>()((set, get) => ({
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

    addMeal: async (meal) => {
      try {
        await repo.addMeal(userId, meal);
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
        await repo.moveMeal(mealId, userId, newDate);
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
        await repo.deleteMeal(mealId);
        await get().fetchDayMealPlan(get().selectedDate);
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    swapMeal: async (mealId: string) => {
      const date = Object.keys(get().meals).find((d) => get().meals[d].some((m) => m.id === mealId));
      const meal = date ? get().meals[date].find((m) => m.id === mealId) : undefined;
      if (!date || !meal || !meal.recipeId) return;
      const swap = nextMealOption({ recipeId: meal.recipeId, title: meal.title, description: meal.description }, meal.alternatives);
      if (!swap) return;
      const replace = (m: MealPlanMeal) =>
        set((state) => ({ meals: { ...state.meals, [date]: (state.meals[date] ?? []).map((x) => (x.id === mealId ? m : x)) } }));
      replace({ ...meal, recipeId: swap.current.recipeId, title: swap.current.title, description: swap.current.description, alternatives: swap.alternatives });
      try {
        await repo.swapMeal(mealId, swap.current, swap.alternatives);
      } catch (err) {
        replace(meal);
        set({ error: (err as Error).message });
      }
    },

    addFeedback: async (mealId: string, feedback) => {
      try {
        await repo.addMealFeedback(userId, mealId, feedback);
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
  }));
}
