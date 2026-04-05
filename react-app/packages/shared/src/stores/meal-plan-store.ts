// Ported from: lib/screens/main/plan/controllers/meal_plan.dart

import { createStore } from 'zustand/vanilla';
import type { ApiClient } from '../api/client';
import type { Meal } from '../models/meal';
import { parseMeal } from '../models/meal';

export interface MealPlanState {
  meals: Record<string, Meal[]>; // keyed by date string (YYYY-MM-DD)
  isLoading: boolean;
  error: string | null;
  selectedDate: string; // YYYY-MM-DD
}

export interface MealPlanActions {
  fetchMealPlan: (startDate: string, endDate: string) => Promise<void>;
  fetchDayMealPlan: (date: string) => Promise<void>;
  addMeal: (data: Record<string, unknown>) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
}

export type MealPlanStore = MealPlanState & MealPlanActions;

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function createMealPlanStore(apiClient: ApiClient) {
  return createStore<MealPlanStore>()((set, get) => ({
    meals: {},
    isLoading: false,
    error: null,
    selectedDate: todayString(),

    fetchMealPlan: async (startDate: string, endDate: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.getMealPlan(startDate, endDate);
        const data = response.data?.data;
        // Parse meals grouped by date
        const meals: Record<string, Meal[]> = {};
        if (Array.isArray(data)) {
          for (const item of data) {
            const date = item.date as string;
            if (!meals[date]) meals[date] = [];
            if (Array.isArray(item.meals)) {
              meals[date] = item.meals.map((m: Record<string, unknown>) => parseMeal(m));
            }
          }
        }
        set({ meals: { ...get().meals, ...meals }, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    fetchDayMealPlan: async (date: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.getDayMealPlan(date);
        const data = response.data?.data;
        const dayMeals = Array.isArray(data) ? data.map((m: Record<string, unknown>) => parseMeal(m)) : [];
        set({
          meals: { ...get().meals, [date]: dayMeals },
          isLoading: false,
        });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    addMeal: async (data: Record<string, unknown>) => {
      try {
        await apiClient.addMeal(data);
        // Re-fetch current day after adding
        const { selectedDate } = get();
        await get().fetchDayMealPlan(selectedDate);
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    deleteMeal: async (mealId: string) => {
      try {
        await apiClient.deleteMeal(mealId);
        const { selectedDate } = get();
        await get().fetchDayMealPlan(selectedDate);
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    setSelectedDate: (date: string) => set({ selectedDate: date }),
  }));
}
