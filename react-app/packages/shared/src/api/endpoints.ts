// Ported from: lib/dependencies/endpoints.dart + lib/providers/externals/userapi/endpoints.dart

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
  fetchFoods: `${BASE_URL}/foods/fetch?limit=10`,
} as const;

// API v1 endpoints (from providers/externals/userapi/endpoints.dart)
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

  // User
  getUser: {
    url: `${API_BASE}/user`,
    method: 'GET',
    description: '[GET] User account data',
    requiresAuthentication: true,
  },

  // Meal Plan
  getMealPlan: {
    url: `${API_BASE}/plan`,
    method: 'GET',
    description: '[GET] User meal plan for a date range',
    requiresAuthentication: true,
  },
  getDayMealPlan: {
    url: `${API_BASE}/plan/day`,
    method: 'GET',
    description: '[GET] User meal plan for a specific date',
    requiresAuthentication: true,
  },
  addMeal: {
    url: `${API_BASE}/plan/meal`,
    method: 'PUT',
    description: '[PUT] Add meal to plan',
    requiresAuthentication: true,
  },
  getMeal: {
    url: `${API_BASE}/plan/meal`,
    method: 'GET',
    description: '[GET] Get plan meal details',
    requiresAuthentication: true,
  },
  updateMeal: {
    url: `${API_BASE}/plan/meal/update`,
    method: 'POST',
    description: '[POST] Update meal in calendar',
    requiresAuthentication: true,
  },
  moveMeal: {
    url: `${API_BASE}/plan/meal/move`,
    method: 'POST',
    description: '[POST] Move meal in calendar',
    requiresAuthentication: true,
  },
  deleteMeal: {
    url: `${API_BASE}/plan/meal`,
    method: 'DELETE',
    description: '[DELETE] Meal from plan',
    requiresAuthentication: true,
  },
  addMealFeedback: {
    url: `${API_BASE}/plan/meal/feedback`,
    method: 'PUT',
    description: '[PUT] Add feedback to meal',
    requiresAuthentication: true,
  },
  deleteMealFeedback: {
    url: `${API_BASE}/plan/meal/feedback`,
    method: 'DELETE',
    description: '[DELETE] Delete feedback from meal',
    requiresAuthentication: true,
  },

  // Recipes
  getRecipe: {
    url: `${API_BASE}/recipe`,
    method: 'GET',
    description: '[GET] Recipe details',
    requiresAuthentication: true,
  },
  addRecipe: {
    url: `${API_BASE}/recipe`,
    method: 'PUT',
    description: '[PUT] Add a new recipe',
    requiresAuthentication: true,
  },
  deleteRecipe: {
    url: `${API_BASE}/recipe`,
    method: 'DELETE',
    description: '[DELETE] Delete a recipe',
    requiresAuthentication: true,
  },
  searchRecipes: {
    url: `${API_BASE}/recipe/search`,
    method: 'GET',
    description: '[GET] Search recipes according to filtering criteria',
    requiresAuthentication: true,
  },
  getSimilarRecipes: {
    url: `${API_BASE}/recipe/similar`,
    method: 'GET',
    description: '[GET] Similar recipes to provided recipe',
    requiresAuthentication: true,
  },
  classifyRecipe: {
    url: `${API_BASE}/recipe/classification`,
    method: 'PUT',
    description: '[PUT] Recipe classification (like, dislike, favorite)',
    requiresAuthentication: true,
  },
  updateRecipeClassification: {
    url: `${API_BASE}/recipe/classification/update`,
    method: 'POST',
    description: '[POST] Recipe classification update',
    requiresAuthentication: true,
  },
  getClassifiedRecipes: {
    url: `${API_BASE}/recipe/classification`,
    method: 'GET',
    description: '[GET] Get classified recipes',
    requiresAuthentication: true,
  },
  addRecipeReview: {
    url: `${API_BASE}/recipe/review`,
    method: 'PUT',
    description: '[PUT] Add review on recipe',
    requiresAuthentication: true,
  },
} as const satisfies Record<string, ApiEndpoint>;
