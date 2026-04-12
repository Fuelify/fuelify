'use client';

import React, { createContext, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import {
  // DynamoDB-backed (auth)
  createAuthStore,
  ApiClient,
  WebTokenStorage,
  // Supabase-backed (data)
  createSupabaseClient,
  MealPlanRepository,
  RecipeRepository,
  // Platform-agnostic stores
  createPreferencesStore,
  createNavigationStore,
  createMealPlanStore,
  createRecipeStore,
  // Types
  type AuthStore,
  type PreferencesStore,
  type NavigationStore,
  type MealPlanStore,
  type RecipeStore,
} from '@fuelify/shared';

// ===================================================================
// DynamoDB — Auth via existing API (login, user settings, onboarding)
// ===================================================================
const tokenStorage = new WebTokenStorage();
const apiClient = new ApiClient(tokenStorage);

// ===================================================================
// Supabase — PostgreSQL for meal plans, recipes, food, reviews
// ===================================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const mealPlanRepo = new MealPlanRepository(supabase);
const recipeRepo = new RecipeRepository(supabase);

// TODO: Replace with actual user ID from auth store after login
const PLACEHOLDER_USER_ID = 'current-user';

// Store types
type AuthStoreApi = ReturnType<typeof createAuthStore>;
type PreferencesStoreApi = ReturnType<typeof createPreferencesStore>;
type NavigationStoreApi = ReturnType<typeof createNavigationStore>;
type MealPlanStoreApi = ReturnType<typeof createMealPlanStore>;
type RecipeStoreApi = ReturnType<typeof createRecipeStore>;

// Contexts
const AuthStoreContext = createContext<AuthStoreApi | null>(null);
const PreferencesStoreContext = createContext<PreferencesStoreApi | null>(null);
const NavigationStoreContext = createContext<NavigationStoreApi | null>(null);
const MealPlanStoreContext = createContext<MealPlanStoreApi | null>(null);
const RecipeStoreContext = createContext<RecipeStoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const authStoreRef = useRef<AuthStoreApi>(null);
  const preferencesStoreRef = useRef<PreferencesStoreApi>(null);
  const navigationStoreRef = useRef<NavigationStoreApi>(null);
  const mealPlanStoreRef = useRef<MealPlanStoreApi>(null);
  const recipeStoreRef = useRef<RecipeStoreApi>(null);

  if (!authStoreRef.current) {
    authStoreRef.current = createAuthStore(apiClient, tokenStorage);
  }
  if (!preferencesStoreRef.current) {
    preferencesStoreRef.current = createPreferencesStore();
  }
  if (!navigationStoreRef.current) {
    navigationStoreRef.current = createNavigationStore();
  }
  if (!mealPlanStoreRef.current) {
    // Supabase-backed: MealPlanRepository → PostgreSQL
    mealPlanStoreRef.current = createMealPlanStore(mealPlanRepo, PLACEHOLDER_USER_ID);
  }
  if (!recipeStoreRef.current) {
    // Supabase-backed: RecipeRepository → PostgreSQL
    recipeStoreRef.current = createRecipeStore(recipeRepo, PLACEHOLDER_USER_ID);
  }

  return (
    <AuthStoreContext.Provider value={authStoreRef.current}>
      <PreferencesStoreContext.Provider value={preferencesStoreRef.current}>
        <NavigationStoreContext.Provider value={navigationStoreRef.current}>
          <MealPlanStoreContext.Provider value={mealPlanStoreRef.current}>
            <RecipeStoreContext.Provider value={recipeStoreRef.current}>
              {children}
            </RecipeStoreContext.Provider>
          </MealPlanStoreContext.Provider>
        </NavigationStoreContext.Provider>
      </PreferencesStoreContext.Provider>
    </AuthStoreContext.Provider>
  );
}

// Hooks for consuming stores in components
export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  const store = useContext(AuthStoreContext);
  if (!store) throw new Error('useAuthStore must be used within StoreProvider');
  return useStore(store, selector);
}

export function usePreferencesStore<T>(selector: (state: PreferencesStore) => T): T {
  const store = useContext(PreferencesStoreContext);
  if (!store) throw new Error('usePreferencesStore must be used within StoreProvider');
  return useStore(store, selector);
}

export function useNavigationStore<T>(selector: (state: NavigationStore) => T): T {
  const store = useContext(NavigationStoreContext);
  if (!store) throw new Error('useNavigationStore must be used within StoreProvider');
  return useStore(store, selector);
}

export function useMealPlanStore<T>(selector: (state: MealPlanStore) => T): T {
  const store = useContext(MealPlanStoreContext);
  if (!store) throw new Error('useMealPlanStore must be used within StoreProvider');
  return useStore(store, selector);
}

export function useRecipeStore<T>(selector: (state: RecipeStore) => T): T {
  const store = useContext(RecipeStoreContext);
  if (!store) throw new Error('useRecipeStore must be used within StoreProvider');
  return useStore(store, selector);
}
