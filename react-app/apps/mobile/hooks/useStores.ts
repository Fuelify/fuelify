// Store hooks for React Native — single Supabase client for auth + data.
// Per-user stores come from the shared createUserStores() composition root.

import { useEffect, useMemo } from 'react';
import { useStore, type StoreApi } from 'zustand';
import {
  createSupabaseClient,
  createAuthStore,
  createPreferencesStore,
  createNavigationStore,
  createUserStores,
  type AuthStore,
  type PreferencesStore,
  type NavigationStore,
  type UserStores,
} from '@fuelify/shared';

// ===================================================================
// Single Supabase client
// ===================================================================
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Login gate toggle — "true" skips login; an anonymous Supabase session
// is created instead so RLS-protected data still works.
export const AUTH_DISABLED = process.env.EXPO_PUBLIC_AUTH_DISABLED === 'true';

let supabase: ReturnType<typeof createSupabaseClient>;
function getSupabase() {
  if (!supabase) supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

// ===================================================================
// App-wide singletons
// ===================================================================
let authStore: StoreApi<AuthStore>;
let preferencesStore: StoreApi<PreferencesStore>;
let navigationStore: StoreApi<NavigationStore>;

function getAuthStore() {
  if (!authStore) authStore = createAuthStore(getSupabase(), { authDisabled: AUTH_DISABLED });
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

// Per-user stores, rebuilt when the signed-in user changes
let userStores: UserStores | null = null;
function getUserStores(userId: string): UserStores {
  if (!userStores || userStores.userId !== userId) userStores = createUserStores(getSupabase(), userId);
  return userStores;
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
  return useStore(getAuthStore(), selector);
}

export function usePreferencesStore<T>(selector: (state: PreferencesStore) => T): T {
  return useStore(getPreferencesStore(), selector);
}

export function useNavigationStore<T>(selector: (state: NavigationStore) => T): T {
  return useStore(getNavigationStore(), selector);
}

/** Builds a selector hook for one per-user store. */
function userStoreHook<S>(pick: (stores: UserStores) => StoreApi<S>, name: string) {
  return function useUserStore<T>(selector: (state: S) => T): T {
    const userId = useAuthStore((s) => s.userId);
    if (!userId) throw new Error(`${name} requires an authenticated user`);
    return useStore(pick(getUserStores(userId)), selector);
  };
}

export const useProfileStore = userStoreHook((s) => s.profileStore, 'useProfileStore');
export const useMealPlanStore = userStoreHook((s) => s.mealPlanStore, 'useMealPlanStore');
export const useRecipeStore = userStoreHook((s) => s.recipeStore, 'useRecipeStore');
export const useHouseholdStore = userStoreHook((s) => s.householdStore, 'useHouseholdStore');
export const useShoppingCartStore = userStoreHook((s) => s.shoppingCartStore, 'useShoppingCartStore');
export const usePantryStore = userStoreHook((s) => s.pantryStore, 'usePantryStore');
export const useMealSuggestionStore = userStoreHook((s) => s.mealSuggestionStore, 'useMealSuggestionStore');

/** Direct access to the Supabase client — for services (e.g. ReceiptParser). */
export function useSupabaseClient() {
  return getSupabase();
}
