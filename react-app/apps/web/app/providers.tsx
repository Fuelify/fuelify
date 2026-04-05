'use client';

import React, { createContext, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import {
  createAuthStore,
  createPreferencesStore,
  createNavigationStore,
  createMealPlanStore,
  type AuthStore,
  type PreferencesStore,
  type NavigationStore,
  type MealPlanStore,
} from '@fuelify/shared';
import { ApiClient, WebTokenStorage } from '@fuelify/shared';

// Initialize platform-specific dependencies
const tokenStorage = new WebTokenStorage();
const apiClient = new ApiClient(tokenStorage);

// Store types
type AuthStoreApi = ReturnType<typeof createAuthStore>;
type PreferencesStoreApi = ReturnType<typeof createPreferencesStore>;
type NavigationStoreApi = ReturnType<typeof createNavigationStore>;
type MealPlanStoreApi = ReturnType<typeof createMealPlanStore>;

// Contexts
const AuthStoreContext = createContext<AuthStoreApi | null>(null);
const PreferencesStoreContext = createContext<PreferencesStoreApi | null>(null);
const NavigationStoreContext = createContext<NavigationStoreApi | null>(null);
const MealPlanStoreContext = createContext<MealPlanStoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const authStoreRef = useRef<AuthStoreApi>(null);
  const preferencesStoreRef = useRef<PreferencesStoreApi>(null);
  const navigationStoreRef = useRef<NavigationStoreApi>(null);
  const mealPlanStoreRef = useRef<MealPlanStoreApi>(null);

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
    mealPlanStoreRef.current = createMealPlanStore(apiClient);
  }

  return (
    <AuthStoreContext.Provider value={authStoreRef.current}>
      <PreferencesStoreContext.Provider value={preferencesStoreRef.current}>
        <NavigationStoreContext.Provider value={navigationStoreRef.current}>
          <MealPlanStoreContext.Provider value={mealPlanStoreRef.current}>
            {children}
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
