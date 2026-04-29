// Meal plan store — now backed by Supabase/PostgreSQL
// Previously routed through ApiClient → DynamoDB, now uses MealPlanRepository directly

import { createStore } from 'zustand/vanilla';
import type { MealPlanRepository, MealPlanMeal } from '../supabase/meal-plan-repo';

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
  addFeedback: (mealId: string, feedback: { rating?: number; comment?: string }) => Promise<void>;
  deleteFeedback: (mealId: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
}

export type MealPlanStore = MealPlanState & MealPlanActions;

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function createMealPlanStore(repo: MealPlanRepository, userId: string) {
  return createStore<MealPlanStore>()((set, get) => ({
    meals: {},
    isLoading: false,
    error: null,
    selectedDate: todayString(),

    fetchMealPlan: async (startDate: string, endDate: string) => {
      set({ isLoading: true, error: null });
      try {
        const grouped = await repo.getMealPlan(userId, startDate, endDate);
        set({ meals: { ...get().meals, ...grouped }, isLoading: false });
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
