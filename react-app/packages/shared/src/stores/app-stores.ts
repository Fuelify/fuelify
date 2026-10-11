// Composition root for per-user state. Both apps call this instead of wiring
// repositories and stores by hand, so the dependency graph lives in one place.

import type { TypedSupabaseClient } from '../supabase/client';
import { ProfileRepository } from '../supabase/profile-repo';
import { MealPlanRepository } from '../supabase/meal-plan-repo';
import { RecipeRepository } from '../supabase/recipe-repo';
import { HouseholdRepository } from '../supabase/household-repo';
import { ShoppingCartRepository } from '../supabase/shopping-cart-repo';
import { PantryRepository } from '../supabase/pantry-repo';
import { MealSuggester } from '../services/meal-suggester';
import { createProfileStore } from './profile-store';
import { createMealPlanStore } from './meal-plan-store';
import { createRecipeStore } from './recipe-store';
import { createHouseholdStore } from './household-store';
import { createShoppingCartStore } from './shopping-cart-store';
import { createPantryStore } from './pantry-store';
import { createMealSuggestionStore } from './meal-suggestion-store';
import { createPlanGenerationStore } from './plan-generation-store';
import { createGroceryStore, UNAVAILABLE_GROCERY_API, type GroceryApi } from './grocery-store';

/** App-specific services the shared stores need. */
export interface UserStoreServices {
  /** Store connections (the web app provides one backed by its server routes) */
  groceryApi?: GroceryApi;
}

/** Stores that hold one signed-in user's data. Recreate them when the user changes. */
export function createUserStores(supabase: TypedSupabaseClient, userId: string, services: UserStoreServices = {}) {
  const profiles = new ProfileRepository(supabase);
  const meals = new MealPlanRepository(supabase);
  const recipes = new RecipeRepository(supabase);
  const pantry = new PantryRepository(supabase);
  const mealPlanStore = createMealPlanStore(meals, userId);
  const shoppingCartStore = createShoppingCartStore(new ShoppingCartRepository(supabase), userId);
  return {
    userId,
    profileStore: createProfileStore(profiles, userId),
    mealPlanStore,
    planGenerationStore: createPlanGenerationStore({ profiles, recipes, meals, pantry, mealPlanStore }, userId),
    recipeStore: createRecipeStore(recipes, userId),
    householdStore: createHouseholdStore(new HouseholdRepository(supabase), userId),
    shoppingCartStore,
    groceryStore: createGroceryStore(
      { api: services.groceryApi ?? UNAVAILABLE_GROCERY_API, profiles, meals, recipes, pantry, cartStore: shoppingCartStore },
      userId,
    ),
    pantryStore: createPantryStore(pantry, userId),
    mealSuggestionStore: createMealSuggestionStore(new MealSuggester(supabase)),
  };
}

export type UserStores = ReturnType<typeof createUserStores>;
