// Store hooks for React Native — single Supabase client for auth + data

import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import {
  // Supabase
  createSupabaseClient,
  MealPlanRepository,
  RecipeRepository,
  ProfileRepository,
  // Stores
  createAuthStore,
  createProfileStore,
  createPreferencesStore,
  createNavigationStore,
  createMealPlanStore,
  createRecipeStore,
  // Types
  type AuthStore,
  type ProfileStore,
  type PreferencesStore,
  type NavigationStore,
  type MealPlanStore,
  type RecipeStore,
} from '@fuelify/shared';

// ===================================================================
// Single Supabase client
// ===================================================================
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let supabase: ReturnType<typeof createSupabaseClient>;
function getSupabase() {
  if (!supabase) supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

// ===================================================================
// Singleton stores
// ===================================================================
let authStore: ReturnType<typeof createAuthStore>;
let preferencesStore: ReturnType<typeof createPreferencesStore>;
let navigationStore: ReturnType<typeof createNavigationStore>;

function getAuthStore() {
  if (!authStore) authStore = createAuthStore(getSupabase());
  return authStore;
}

function getPreferencesStore() {
  if (!preferencesStore) preferencesStore = createPreferencesStore();
  return preferencesStore;
}

function getNavigationStore() {
  if (!navigationStore) navigationStore = createNavigationStore();
  return navigationStore;
}

// Data stores depend on userId
let dataStores: {
  userId: string;
  profileStore: ReturnType<typeof createProfileStore>;
  mealPlanStore: ReturnType<typeof createMealPlanStore>;
  recipeStore: ReturnType<typeof createRecipeStore>;
} | null = null;

function getDataStores(userId: string) {
  if (dataStores && dataStores.userId === userId) return dataStores;
  const sb = getSupabase();
  dataStores = {
    userId,
    profileStore: createProfileStore(new ProfileRepository(sb), userId),
    mealPlanStore: createMealPlanStore(new MealPlanRepository(sb), userId),
    recipeStore: createRecipeStore(new RecipeRepository(sb), userId),
  };
  return dataStores;
}

// ===================================================================
// Hooks
// ===================================================================

export function useInitializeAuth() {
  const store = useMemo(() => getAuthStore(), []);
  useEffect(() => {
    store.getState().initialize();
  }, [store]);
}

export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  const store = useMemo(() => getAuthStore(), []);
  return useStore(store, selector);
}

export function useProfileStore<T>(selector: (state: ProfileStore) => T): T {
  const userId = useAuthStore((s) => s.userId);
  if (!userId) throw new Error('useProfileStore requires an authenticated user');
  const { profileStore } = useMemo(() => getDataStores(userId), [userId]);
  return useStore(profileStore, selector);
}

export function usePreferencesStore<T>(selector: (state: PreferencesStore) => T): T {
  const store = useMemo(() => getPreferencesStore(), []);
  return useStore(store, selector);
}

export function useNavigationStore<T>(selector: (state: NavigationStore) => T): T {
  const store = useMemo(() => getNavigationStore(), []);
  return useStore(store, selector);
}

export function useMealPlanStore<T>(selector: (state: MealPlanStore) => T): T {
  const userId = useAuthStore((s) => s.userId);
  if (!userId) throw new Error('useMealPlanStore requires an authenticated user');
  const { mealPlanStore } = useMemo(() => getDataStores(userId), [userId]);
  return useStore(mealPlanStore, selector);
}

export function useRecipeStore<T>(selector: (state: RecipeStore) => T): T {
  const userId = useAuthStore((s) => s.userId);
  if (!userId) throw new Error('useRecipeStore requires an authenticated user');
  const { recipeStore } = useMemo(() => getDataStores(userId), [userId]);
  return useStore(recipeStore, selector);
}
