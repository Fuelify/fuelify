'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import {
  // Supabase
  createSupabaseClient,
  MealPlanRepository,
  RecipeRepository,
  ProfileRepository,
  HouseholdRepository,
  ShoppingCartRepository,
  PantryRepository,
  // Services
  MealSuggester,
  // Stores
  createAuthStore,
  createProfileStore,
  createPreferencesStore,
  createNavigationStore,
  createMealPlanStore,
  createRecipeStore,
  createHouseholdStore,
  createShoppingCartStore,
  createPantryStore,
  createMealSuggestionStore,
  // Types
  type AuthStore,
  type ProfileStore,
  type PreferencesStore,
  type NavigationStore,
  type MealPlanStore,
  type RecipeStore,
  type HouseholdStore,
  type ShoppingCartStore,
  type PantryStore,
  type MealSuggestionStore,
} from '@fuelify/shared';

// ===================================================================
// Single Supabase client — handles auth + all data
// ===================================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Store types
type AuthStoreApi = ReturnType<typeof createAuthStore>;
type ProfileStoreApi = ReturnType<typeof createProfileStore>;
type PreferencesStoreApi = ReturnType<typeof createPreferencesStore>;
type NavigationStoreApi = ReturnType<typeof createNavigationStore>;
type MealPlanStoreApi = ReturnType<typeof createMealPlanStore>;
type RecipeStoreApi = ReturnType<typeof createRecipeStore>;
type HouseholdStoreApi = ReturnType<typeof createHouseholdStore>;
type ShoppingCartStoreApi = ReturnType<typeof createShoppingCartStore>;
type PantryStoreApi = ReturnType<typeof createPantryStore>;
type MealSuggestionStoreApi = ReturnType<typeof createMealSuggestionStore>;

// Contexts
const AuthStoreContext = createContext<AuthStoreApi | null>(null);
const ProfileStoreContext = createContext<ProfileStoreApi | null>(null);
const PreferencesStoreContext = createContext<PreferencesStoreApi | null>(null);
const NavigationStoreContext = createContext<NavigationStoreApi | null>(null);
const MealPlanStoreContext = createContext<MealPlanStoreApi | null>(null);
const RecipeStoreContext = createContext<RecipeStoreApi | null>(null);
const HouseholdStoreContext = createContext<HouseholdStoreApi | null>(null);
const ShoppingCartStoreContext = createContext<ShoppingCartStoreApi | null>(null);
const PantryStoreContext = createContext<PantryStoreApi | null>(null);
const MealSuggestionStoreContext = createContext<MealSuggestionStoreApi | null>(null);

// Auth store is created once (no userId dependency)
function useCreateAuthStore() {
  const ref = useRef<AuthStoreApi>(null);
  if (!ref.current) {
    ref.current = createAuthStore(supabase);
  }
  return ref.current;
}

// Data stores depend on userId — recreated when user logs in
function useCreateDataStores(userId: string | null) {
  const [stores, setStores] = useState<{
    profileStore: ProfileStoreApi;
    mealPlanStore: MealPlanStoreApi;
    recipeStore: RecipeStoreApi;
    householdStore: HouseholdStoreApi;
    shoppingCartStore: ShoppingCartStoreApi;
    pantryStore: PantryStoreApi;
    mealSuggestionStore: MealSuggestionStoreApi;
  } | null>(null);

  useEffect(() => {
    if (!userId) {
      setStores(null);
      return;
    }
    const profileRepo = new ProfileRepository(supabase);
    const mealPlanRepo = new MealPlanRepository(supabase);
    const recipeRepo = new RecipeRepository(supabase);
    const householdRepo = new HouseholdRepository(supabase);
    const shoppingCartRepo = new ShoppingCartRepository(supabase);
    const pantryRepo = new PantryRepository(supabase);
    const mealSuggester = new MealSuggester(supabase);
    setStores({
      profileStore: createProfileStore(profileRepo, userId),
      mealPlanStore: createMealPlanStore(mealPlanRepo, userId),
      recipeStore: createRecipeStore(recipeRepo, userId),
      householdStore: createHouseholdStore(householdRepo, userId),
      shoppingCartStore: createShoppingCartStore(shoppingCartRepo, userId),
      pantryStore: createPantryStore(pantryRepo, userId),
      mealSuggestionStore: createMealSuggestionStore(mealSuggester),
    });
  }, [userId]);

  return stores;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const authStore = useCreateAuthStore();
  const userId = useStore(authStore, (s) => s.userId);
  const dataStores = useCreateDataStores(userId);

  const preferencesStoreRef = useRef<PreferencesStoreApi>(null);
  const navigationStoreRef = useRef<NavigationStoreApi>(null);
  if (!preferencesStoreRef.current) preferencesStoreRef.current = createPreferencesStore();
  if (!navigationStoreRef.current) navigationStoreRef.current = createNavigationStore();

  // Initialize auth on mount
  useEffect(() => {
    authStore.getState().initialize();
  }, [authStore]);

  return (
    <AuthStoreContext.Provider value={authStore}>
      <ProfileStoreContext.Provider value={dataStores?.profileStore ?? null}>
        <PreferencesStoreContext.Provider value={preferencesStoreRef.current}>
          <NavigationStoreContext.Provider value={navigationStoreRef.current}>
            <MealPlanStoreContext.Provider value={dataStores?.mealPlanStore ?? null}>
              <RecipeStoreContext.Provider value={dataStores?.recipeStore ?? null}>
                <HouseholdStoreContext.Provider value={dataStores?.householdStore ?? null}>
                  <ShoppingCartStoreContext.Provider value={dataStores?.shoppingCartStore ?? null}>
                    <PantryStoreContext.Provider value={dataStores?.pantryStore ?? null}>
                      <MealSuggestionStoreContext.Provider value={dataStores?.mealSuggestionStore ?? null}>
                        {children}
                      </MealSuggestionStoreContext.Provider>
                    </PantryStoreContext.Provider>
                  </ShoppingCartStoreContext.Provider>
                </HouseholdStoreContext.Provider>
              </RecipeStoreContext.Provider>
            </MealPlanStoreContext.Provider>
          </NavigationStoreContext.Provider>
        </PreferencesStoreContext.Provider>
      </ProfileStoreContext.Provider>
    </AuthStoreContext.Provider>
  );
}

// Hooks
export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  const store = useContext(AuthStoreContext);
  if (!store) throw new Error('useAuthStore must be used within StoreProvider');
  return useStore(store, selector);
}

export function useProfileStore<T>(selector: (state: ProfileStore) => T): T {
  const store = useContext(ProfileStoreContext);
  if (!store) throw new Error('useProfileStore requires an authenticated user');
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
  if (!store) throw new Error('useMealPlanStore requires an authenticated user');
  return useStore(store, selector);
}

export function useRecipeStore<T>(selector: (state: RecipeStore) => T): T {
  const store = useContext(RecipeStoreContext);
  if (!store) throw new Error('useRecipeStore requires an authenticated user');
  return useStore(store, selector);
}

export function useHouseholdStore<T>(selector: (state: HouseholdStore) => T): T {
  const store = useContext(HouseholdStoreContext);
  if (!store) throw new Error('useHouseholdStore requires an authenticated user');
  return useStore(store, selector);
}

export function useShoppingCartStore<T>(selector: (state: ShoppingCartStore) => T): T {
  const store = useContext(ShoppingCartStoreContext);
  if (!store) throw new Error('useShoppingCartStore requires an authenticated user');
  return useStore(store, selector);
}

export function usePantryStore<T>(selector: (state: PantryStore) => T): T {
  const store = useContext(PantryStoreContext);
  if (!store) throw new Error('usePantryStore requires an authenticated user');
  return useStore(store, selector);
}

export function useMealSuggestionStore<T>(selector: (state: MealSuggestionStore) => T): T {
  const store = useContext(MealSuggestionStoreContext);
  if (!store) throw new Error('useMealSuggestionStore requires an authenticated user');
  return useStore(store, selector);
}

/** Direct access to the Supabase client — for services (e.g. ReceiptParser). */
export function useSupabase() {
  return supabase;
}
