'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
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
import { createWebGroceryApi } from './grocery-api';

// ===================================================================
// Single Supabase client — handles auth + all data.
// Placeholder values let the client object exist during Next.js static
// generation (where env vars may be absent). It is never *called* during
// SSR — all network activity happens in effects.
// ===================================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const groceryApi = createWebGroceryApi(supabase);

// Login gate toggle — "true" skips login; an anonymous Supabase session
// is created instead so RLS-protected data still works.
export const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';

// App-wide stores (exist before sign-in) and per-user stores (exist after)
interface AppStores {
  auth: StoreApi<AuthStore>;
  preferences: StoreApi<PreferencesStore>;
  navigation: StoreApi<NavigationStore>;
}

const AppStoresContext = createContext<AppStores | null>(null);
const UserStoresContext = createContext<UserStores | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const appStores = useRef<AppStores | null>(null);
  if (!appStores.current) {
    appStores.current = {
      auth: createAuthStore(supabase, { authDisabled: AUTH_DISABLED }),
      preferences: createPreferencesStore(),
      navigation: createNavigationStore(),
    };
  }
  const { auth } = appStores.current;
  const userId = useStore(auth, (s) => s.userId);

  // Rebuild every per-user store when the signed-in user changes
  const userStores = useMemo(() => (userId ? createUserStores(supabase, userId, { groceryApi }) : null), [userId]);

  useEffect(() => {
    auth.getState().initialize();
  }, [auth]);

  // Write queued behavior events before the tab is hidden or closed, and when the user changes
  useEffect(() => {
    if (!userStores) return;
    const flush = () => {
      if (document.visibilityState === 'hidden') void userStores.behaviorLog.flush();
    };
    document.addEventListener('visibilitychange', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      void userStores.behaviorLog.flush();
    };
  }, [userStores]);

  return (
    <AppStoresContext.Provider value={appStores.current}>
      <UserStoresContext.Provider value={userStores}>{children}</UserStoresContext.Provider>
    </AppStoresContext.Provider>
  );
}

// ----- Hooks ------------------------------------------------------------

/** Builds a selector hook for one store held in a context. */
function storeHook<C, S>(context: React.Context<C | null>, pick: (stores: C) => StoreApi<S>, missing: string) {
  return function useSelected<T>(selector: (state: S) => T): T {
    const stores = useContext(context);
    if (!stores) throw new Error(missing);
    return useStore(pick(stores), selector);
  };
}

const NO_PROVIDER = 'Must be used within StoreProvider';
const NO_USER = 'Requires a signed-in user — render inside a gate that checks useDataStoresReady()';

export const useAuthStore = storeHook(AppStoresContext, (s) => s.auth, NO_PROVIDER);
export const usePreferencesStore = storeHook(AppStoresContext, (s) => s.preferences, NO_PROVIDER);
export const useNavigationStore = storeHook(AppStoresContext, (s) => s.navigation, NO_PROVIDER);

export const useProfileStore = storeHook(UserStoresContext, (s) => s.profileStore, NO_USER);
export const useMealPlanStore = storeHook(UserStoresContext, (s) => s.mealPlanStore, NO_USER);
export const useRecipeStore = storeHook(UserStoresContext, (s) => s.recipeStore, NO_USER);
export const useHouseholdStore = storeHook(UserStoresContext, (s) => s.householdStore, NO_USER);
export const useShoppingCartStore = storeHook(UserStoresContext, (s) => s.shoppingCartStore, NO_USER);
export const usePantryStore = storeHook(UserStoresContext, (s) => s.pantryStore, NO_USER);
export const useMealSuggestionStore = storeHook(UserStoresContext, (s) => s.mealSuggestionStore, NO_USER);
export const usePlanGenerationStore = storeHook(UserStoresContext, (s) => s.planGenerationStore, NO_USER);
export const useGroceryStore = storeHook(UserStoresContext, (s) => s.groceryStore, NO_USER);
export const useCommunityStore = storeHook(UserStoresContext, (s) => s.communityStore, NO_USER);

/** True once a user is signed in and the per-user stores exist. */
export function useDataStoresReady(): boolean {
  return useContext(UserStoresContext) !== null;
}

/** Direct access to the Supabase client — for services (e.g. ReceiptParser). */
export function useSupabase() {
  return supabase;
}
