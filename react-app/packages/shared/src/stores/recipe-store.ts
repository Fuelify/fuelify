// Recipe store — backed by Supabase/PostgreSQL
// Covers recipe CRUD, search, classification (like/dislike/favorite), and reviews

import { createStore } from 'zustand/vanilla';
import type { RecipeRepository, Recipe, RecipeClassification } from '../supabase/recipe-repo';

export interface RecipeState {
  recipes: Recipe[];
  currentRecipe: Recipe | null;
  classifications: RecipeClassification[];
  isLoading: boolean;
  error: string | null;
}

export interface RecipeActions {
  /** Load the full recipe catalog into `recipes` (used by Discover). */
  loadCatalog: () => Promise<void>;
  searchRecipes: (filters: { query?: string; cuisine?: string; dietType?: string; maxCalories?: number }) => Promise<void>;
  getRecipe: (recipeId: string) => Promise<void>;
  getSimilarRecipes: (recipeId: string) => Promise<void>;
  addRecipe: (recipe: { title: string; description?: string; ingredients?: string[]; steps?: string[] }) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  classifyRecipe: (recipeId: string, classification: 'liked' | 'disliked' | 'favorited') => Promise<void>;
  getClassifiedRecipes: (type?: 'liked' | 'disliked' | 'favorited') => Promise<void>;
  addReview: (recipeId: string, review: { rating: number; reviewText?: string }) => Promise<void>;
  clearCurrent: () => void;
}

export type RecipeStore = RecipeState & RecipeActions;

export function createRecipeStore(repo: RecipeRepository, userId: string) {
  return createStore<RecipeStore>()((set, get) => ({
    recipes: [],
    currentRecipe: null,
    classifications: [],
    isLoading: false,
    error: null,

    loadCatalog: async () => {
      set({ isLoading: true, error: null });
      try {
        const recipes = await repo.listAllRecipes();
        set({ recipes, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    searchRecipes: async (filters) => {
      set({ isLoading: true, error: null });
      try {
        const recipes = await repo.searchRecipes(filters);
        set({ recipes, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    getRecipe: async (recipeId: string) => {
      set({ isLoading: true, error: null });
      try {
        const recipe = await repo.getRecipe(recipeId);
        set({ currentRecipe: recipe, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    getSimilarRecipes: async (recipeId: string) => {
      set({ isLoading: true, error: null });
      try {
        const recipes = await repo.getSimilarRecipes(recipeId);
        set({ recipes, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    addRecipe: async (recipe) => {
      try {
        const created = await repo.addRecipe({ ...recipe, createdBy: userId });
        set((state) => ({ recipes: [created, ...state.recipes] }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    deleteRecipe: async (recipeId: string) => {
      try {
        await repo.deleteRecipe(recipeId);
        set((state) => ({ recipes: state.recipes.filter((r) => r.id !== recipeId) }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    classifyRecipe: async (recipeId: string, classification) => {
      // Optimistic: reflect the choice locally right away, roll back on failure
      const previous = get().classifications;
      const others = previous.filter((c) => c.recipeId !== recipeId);
      set({ classifications: [{ id: `local-${recipeId}`, recipeId, classification }, ...others] });
      try {
        await repo.classifyRecipe(userId, recipeId, classification);
      } catch (err) {
        set({ classifications: previous, error: (err as Error).message });
      }
    },

    getClassifiedRecipes: async (type?) => {
      set({ isLoading: true, error: null });
      try {
        const classifications = await repo.getClassifiedRecipes(userId, type);
        set({ classifications, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    addReview: async (recipeId: string, review) => {
      try {
        await repo.addReview(userId, recipeId, review);
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    clearCurrent: () => set({ currentRecipe: null }),
  }));
}
