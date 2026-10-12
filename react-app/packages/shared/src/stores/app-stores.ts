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
import { GroceryRepository } from '../supabase/grocery-repo';
import { BehaviorRepository } from '../supabase/behavior-repo';
import { readGroceryConfig } from '../models/grocery';
import { createBehaviorLog } from './behavior-log';
import { selectActiveHousehold } from './household-store';
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
  // Every choice worth learning from goes to behavior_events, stamped with the
  // settings in force at the time (read lazily from the stores below)
  const behaviorLog = createBehaviorLog(new BehaviorRepository(supabase), userId, () => {
    const profile = profileStore.getState().profile;
    const households = householdStore.getState();
    const household = selectActiveHousehold(households);
    const grocery = readGroceryConfig(profile);
    return {
      diet: profile?.diet ?? null,
      allergens: profile?.allergens ?? [],
      groceryStrategy: grocery.strategy,
      maxStores: grocery.maxStores,
      householdPlan: household?.plan ?? null,
      householdSize: households.members.length || undefined,
    };
  });
  const profileStore = createProfileStore(profiles, userId);
  const householdStore = createHouseholdStore(new HouseholdRepository(supabase), userId);
  const mealPlanStore = createMealPlanStore(meals, userId, behaviorLog);
  const shoppingCartStore = createShoppingCartStore(new ShoppingCartRepository(supabase), userId);
  return {
    userId,
    behaviorLog,
    profileStore,
    mealPlanStore,
    planGenerationStore: createPlanGenerationStore({ profiles, recipes, meals, pantry, mealPlanStore, log: behaviorLog }, userId),
    recipeStore: createRecipeStore(recipes, userId),
    householdStore,
    shoppingCartStore,
    groceryStore: createGroceryStore(
      { api: services.groceryApi ?? UNAVAILABLE_GROCERY_API, profiles, meals, recipes, pantry, grocery: new GroceryRepository(supabase), cartStore: shoppingCartStore, mealPlanStore, log: behaviorLog },
      userId,
    ),
    pantryStore: createPantryStore(pantry, userId),
    mealSuggestionStore: createMealSuggestionStore(new MealSuggester(supabase)),
  };
}

export type UserStores = ReturnType<typeof createUserStores>;
