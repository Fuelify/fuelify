// Meal-suggestion store — caches the last AI-generated meal suggestions for
// the pantry. Suggestions are transient (not persisted) and re-generated on
// demand.

import { createStore } from 'zustand/vanilla';
import type { MealSuggester } from '../services/meal-suggester';
import type { PantryItem } from '../models/pantry';
import type {
  MealSuggestion,
  MealSuggestionRequest,
} from '../models/meal-suggestion';

export interface MealSuggestionState {
  suggestions: MealSuggestion[];
  prioritizedItems: string[];
  isGenerating: boolean;
  error: string | null;
  /** Timestamp of the last successful generation. */
  generatedAt: string | null;
}

export interface MealSuggestionActions {
  generate: (items: PantryItem[], options?: MealSuggestionRequest) => Promise<void>;
  clear: () => void;
}

export type MealSuggestionStore = MealSuggestionState & MealSuggestionActions;

export function createMealSuggestionStore(suggester: MealSuggester) {
  return createStore<MealSuggestionStore>()((set) => ({
    suggestions: [],
    prioritizedItems: [],
    isGenerating: false,
    error: null,
    generatedAt: null,

    generate: async (items, options) => {
      set({ isGenerating: true, error: null });
      try {
        const result = await suggester.suggest(items, options);
        set({
          suggestions: result.suggestions,
          prioritizedItems: result.prioritizedItems,
          isGenerating: false,
          generatedAt: new Date().toISOString(),
        });
      } catch (err) {
        set({ isGenerating: false, error: (err as Error).message });
      }
    },

    clear: () =>
      set({
        suggestions: [],
        prioritizedItems: [],
        error: null,
        generatedAt: null,
      }),
  }));
}
