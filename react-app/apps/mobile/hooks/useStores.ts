// Platform-specific store initialization for React Native
// DynamoDB: auth via ApiClient (login, user settings, onboarding)
// Supabase: data via repositories (meal plans, recipes, food, reviews)

import { useMemo } from 'react';
import { useStore } from 'zustand';
import {
  // DynamoDB-backed (auth)
  createAuthStore,
  ApiClient,
  type TokenStorage,
  type TokenData,
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
// Token storage adapter for React Native
// In production, swap with expo-secure-store calls
// ===================================================================
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

// ===================================================================
// Supabase config — set via environment or app config
// ===================================================================
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// TODO: Replace with actual user ID from auth store after login
const PLACEHOLDER_USER_ID = 'current-user';

// ===================================================================
// Singleton instances
// ===================================================================
let tokenStorage: MobileTokenStorage;
let apiClient: ApiClient;
let mealPlanRepo: MealPlanRepository;
let recipeRepo: RecipeRepository;

function getDeps() {
  if (!tokenStorage) tokenStorage = new MobileTokenStorage();
  if (!apiClient) apiClient = new ApiClient(tokenStorage);
  if (!mealPlanRepo) {
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    mealPlanRepo = new MealPlanRepository(supabase);
    recipeRepo = new RecipeRepository(supabase);
  }
  return { apiClient, tokenStorage, mealPlanRepo, recipeRepo };
}

// Store singletons
let authStore: ReturnType<typeof createAuthStore>;
let preferencesStore: ReturnType<typeof createPreferencesStore>;
let navigationStore: ReturnType<typeof createNavigationStore>;
let mealPlanStore: ReturnType<typeof createMealPlanStore>;
let recipeStore: ReturnType<typeof createRecipeStore>;

function getStores() {
  const deps = getDeps();
  if (!authStore) authStore = createAuthStore(deps.apiClient, deps.tokenStorage);
  if (!preferencesStore) preferencesStore = createPreferencesStore();
  if (!navigationStore) navigationStore = createNavigationStore();
  // Supabase-backed stores
  if (!mealPlanStore) mealPlanStore = createMealPlanStore(deps.mealPlanRepo, PLACEHOLDER_USER_ID);
  if (!recipeStore) recipeStore = createRecipeStore(deps.recipeRepo, PLACEHOLDER_USER_ID);
  return { authStore, preferencesStore, navigationStore, mealPlanStore, recipeStore };
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

export function useRecipeStore<T>(selector: (state: RecipeStore) => T): T {
  const { recipeStore } = useMemo(() => getStores(), []);
  return useStore(recipeStore, selector);
}
