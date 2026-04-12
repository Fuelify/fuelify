// API endpoints — DynamoDB-backed (auth & user settings only)
// Meal plans, recipes, and food data now go through Supabase directly.

export interface ApiEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  requiresAuthentication: boolean;
}

// Base URL configuration — mirrors AppUrl from Flutter
const LIVE_BASE_URL = 'http://18.117.207.252';
const LOCAL_BASE_URL = 'http://localhost:3000';

// Toggle this for dev vs prod
export const BASE_URL = LOCAL_BASE_URL;
export const API_VERSION = '/api/v1';
const API_BASE = `${BASE_URL}${API_VERSION}`;

// Legacy endpoints (from dependencies/endpoints.dart)
export const LegacyEndpoints = {
  login: `${BASE_URL}/user/login`,
  register: `${BASE_URL}/user/register`,
  forgotPassword: `${BASE_URL}/forgot-password`,
  testToken: `${BASE_URL}/tokentest`,
  userUpdateProfile: `${BASE_URL}/user/profile/update`,
  userUpdateOnboardingState: `${BASE_URL}/user/state/onboarding`,
} as const;

// ===================================================================
// DynamoDB-backed endpoints (auth, user account, settings, onboarding)
// These continue to go through the existing Node/Express API → DynamoDB
// ===================================================================
export const Endpoints = {
  // Auth
  login: {
    url: `${API_BASE}/user/login`,
    method: 'POST',
    description: '[POST] User request to login with provided credentials',
    requiresAuthentication: false,
  },
  logout: {
    url: `${API_BASE}/user/logout`,
    method: 'POST',
    description: '[POST] User request to logout',
    requiresAuthentication: true,
  },

  // User account & settings (DynamoDB)
  getUser: {
    url: `${API_BASE}/user`,
    method: 'GET',
    description: '[GET] User account data',
    requiresAuthentication: true,
  },
  updateProfile: {
    url: `${BASE_URL}/user/profile/update`,
    method: 'POST',
    description: '[POST] Update user profile (DynamoDB)',
    requiresAuthentication: true,
  },
  updateOnboardingState: {
    url: `${BASE_URL}/user/state/onboarding`,
    method: 'POST',
    description: '[POST] Update user onboarding state (DynamoDB)',
    requiresAuthentication: true,
  },
} as const satisfies Record<string, ApiEndpoint>;

// ===================================================================
// Supabase-backed data (meal plans, recipes, food, reviews)
// These no longer go through the API — they use the Supabase client
// directly via MealPlanRepository and RecipeRepository.
//
// Migrated endpoints (for reference):
//   GET    /api/v1/plan              → MealPlanRepository.getMealPlan()
//   GET    /api/v1/plan/day          → MealPlanRepository.getDayMealPlan()
//   PUT    /api/v1/plan/meal         → MealPlanRepository.addMeal()
//   GET    /api/v1/plan/meal         → (included in getMealPlan results)
//   POST   /api/v1/plan/meal/update  → MealPlanRepository.updateMeal()
//   POST   /api/v1/plan/meal/move    → MealPlanRepository.moveMeal()
//   DELETE /api/v1/plan/meal         → MealPlanRepository.deleteMeal()
//   PUT    /api/v1/plan/meal/feedback   → MealPlanRepository.addMealFeedback()
//   DELETE /api/v1/plan/meal/feedback   → MealPlanRepository.deleteMealFeedback()
//   GET    /api/v1/recipe            → RecipeRepository.getRecipe()
//   PUT    /api/v1/recipe            → RecipeRepository.addRecipe()
//   DELETE /api/v1/recipe            → RecipeRepository.deleteRecipe()
//   GET    /api/v1/recipe/search     → RecipeRepository.searchRecipes()
//   GET    /api/v1/recipe/similar    → RecipeRepository.getSimilarRecipes()
//   PUT    /api/v1/recipe/classification      → RecipeRepository.classifyRecipe()
//   POST   /api/v1/recipe/classification/update → RecipeRepository.updateClassification()
//   GET    /api/v1/recipe/classification       → RecipeRepository.getClassifiedRecipes()
//   PUT    /api/v1/recipe/review     → RecipeRepository.addReview()
// ===================================================================
