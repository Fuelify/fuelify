// Platform-specific store initialization for React Native
// Uses expo-secure-store for token storage instead of localStorage

import { useMemo } from 'react';
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
  ApiClient,
  type TokenStorage,
  type TokenData,
} from '@fuelify/shared';

// Expo secure store adapter — implements the shared TokenStorage interface
// In a real setup, import * as SecureStore from 'expo-secure-store'
// For now, this is an in-memory fallback; swap with real SecureStore in production
class MobileTokenStorage implements TokenStorage {
  private store: Map<string, string> = new Map();

  async storeTokens(accessToken: string, refreshToken: string, expiryTime: Date): Promise<void> {
    // In production: await SecureStore.setItemAsync('auth_token', accessToken);
    this.store.set('auth_token', accessToken);
    this.store.set('refresh_token', refreshToken);
    this.store.set('token_expiry', expiryTime.toISOString());
  }

  async readTokens(): Promise<TokenData> {
    const accessToken = this.store.get('auth_token') ?? null;
    const refreshToken = this.store.get('refresh_token') ?? null;
    const expiryStr = this.store.get('token_expiry');
    const expiryTime = expiryStr ? new Date(expiryStr) : null;
    return { accessToken, refreshToken, expiryTime };
  }

  async deleteTokens(): Promise<void> {
    this.store.delete('auth_token');
    this.store.delete('refresh_token');
    this.store.delete('token_expiry');
  }
}

// Singleton instances
let tokenStorage: MobileTokenStorage;
let apiClient: ApiClient;

function getApiClient() {
  if (!tokenStorage) tokenStorage = new MobileTokenStorage();
  if (!apiClient) apiClient = new ApiClient(tokenStorage);
  return { apiClient, tokenStorage };
}

// Store singletons
let authStore: ReturnType<typeof createAuthStore>;
let preferencesStore: ReturnType<typeof createPreferencesStore>;
let navigationStore: ReturnType<typeof createNavigationStore>;
let mealPlanStore: ReturnType<typeof createMealPlanStore>;

function getStores() {
  const { apiClient, tokenStorage } = getApiClient();
  if (!authStore) authStore = createAuthStore(apiClient, tokenStorage);
  if (!preferencesStore) preferencesStore = createPreferencesStore();
  if (!navigationStore) navigationStore = createNavigationStore();
  if (!mealPlanStore) mealPlanStore = createMealPlanStore(apiClient);
  return { authStore, preferencesStore, navigationStore, mealPlanStore };
}

export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  const { authStore } = useMemo(() => getStores(), []);
  return useStore(authStore, selector);
}

export function usePreferencesStore<T>(selector: (state: PreferencesStore) => T): T {
  const { preferencesStore } = useMemo(() => getStores(), []);
  return useStore(preferencesStore, selector);
}

export function useNavigationStore<T>(selector: (state: NavigationStore) => T): T {
  const { navigationStore } = useMemo(() => getStores(), []);
  return useStore(navigationStore, selector);
}

export function useMealPlanStore<T>(selector: (state: MealPlanStore) => T): T {
  const { mealPlanStore } = useMemo(() => getStores(), []);
  return useStore(mealPlanStore, selector);
}
