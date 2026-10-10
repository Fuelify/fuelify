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

/** Stores that hold one signed-in user's data. Recreate them when the user changes. */
export function createUserStores(supabase: TypedSupabaseClient, userId: string) {
  return {
    userId,
    profileStore: createProfileStore(new ProfileRepository(supabase), userId),
    mealPlanStore: createMealPlanStore(new MealPlanRepository(supabase), userId),
    recipeStore: createRecipeStore(new RecipeRepository(supabase), userId),
    householdStore: createHouseholdStore(new HouseholdRepository(supabase), userId),
    shoppingCartStore: createShoppingCartStore(new ShoppingCartRepository(supabase), userId),
    pantryStore: createPantryStore(new PantryRepository(supabase), userId),
    mealSuggestionStore: createMealSuggestionStore(new MealSuggester(supabase)),
  };
}

export type UserStores = ReturnType<typeof createUserStores>;
