// AI-generated meal suggestions based on current pantry contents.
// Produced by the `suggest-meals` Supabase Edge Function (Anthropic Claude).

/** A single ingredient referenced by a suggested meal. */
export interface SuggestedIngredient {
  /** The pantry item name the model matched against, if any. */
  pantryItemName?: string;
  /** Display name for the ingredient (may be more general than the pantry item). */
  name: string;
  /** Quantity needed, as a free-form string (e.g. "1 cup", "2 tbsp", "to taste"). */
  amount?: string;
  /** True when this ingredient is not in the pantry (user must buy it). */
  missing?: boolean;
  /** True when this ingredient matched a partially-opened pantry item. */
  usesOpenItem?: boolean;
}

/** A single meal suggestion returned by the LLM. */
export interface MealSuggestion {
  /** Short human title. */
  title: string;
  /** One-line description of the dish. */
  description: string;
  /** Category hint — e.g. "Breakfast", "Lunch", "Dinner", "Snack". */
  mealType?: string;
  /** Estimated prep + cook time as a free-form string (e.g. "25 min"). */
  estimatedTime?: string;
  /** Serving count. */
  servings?: number;
  /** Ingredients with pantry-match metadata. */
  ingredients: SuggestedIngredient[];
  /** Ordered instruction steps. */
  steps: string[];
  /**
   * 0..100 — higher means the recipe uses more partially-consumed items that
   * should be used up soon. Surfaced as a "use-it-up" score.
   */
  useItUpScore: number;
  /** Model's free-form notes — e.g. why it was picked. */
  notes?: string;
}

/** Full response from the `suggest-meals` edge function. */
export interface MealSuggestionResult {
  suggestions: MealSuggestion[];
  /** Items the model decided to prioritize (open or near-expiry). */
  prioritizedItems: string[];
  /** Model + prompt metadata, primarily useful for debugging. */
  model?: string;
}

/** Input options for generating suggestions. */
export interface MealSuggestionRequest {
  /** Restrict to a meal type, e.g. "dinner". */
  mealType?: string;
  /** Number of suggestions to return (1..6). */
  count?: number;
  /** Free-form dietary notes (e.g. "vegetarian", "gluten-free"). */
  dietary?: string;
  /** Additional free-form user hints. */
  notes?: string;
}
