// Meal suggestions via Supabase Edge Function `suggest-meals`.
// The function proxies Anthropic's Claude API to keep the API key server-side.

import type { TypedSupabaseClient } from '../supabase/client';
import type { PantryItem } from '../models/pantry';
import type {
  MealSuggestionRequest,
  MealSuggestionResult,
} from '../models/meal-suggestion';

/**
 * Condensed pantry item payload sent to the LLM. Keeping this minimal both
 * shrinks the prompt and avoids leaking unnecessary household/user IDs.
 */
export interface PantryItemForSuggestion {
  name: string;
  brand?: string | null;
  category?: string | null;
  storageZone: string;
  quantity: number;
  unit?: string | null;
  remainingPct: number;
  status: string;
  expirationDate?: string | null;
}

/** Convert a full PantryItem into the condensed suggestion payload. */
export function toSuggestionPayload(item: PantryItem): PantryItemForSuggestion {
  return {
    name: item.name,
    brand: item.brand,
    category: item.category,
    storageZone: item.storageZone,
    quantity: item.quantity,
    unit: item.unit,
    remainingPct: item.remainingPct,
    status: item.status,
    expirationDate: item.expirationDate,
  };
}

export class MealSuggester {
  constructor(private supabase: TypedSupabaseClient) {}

  /** Generate meal suggestions from the given pantry items. */
  async suggest(
    items: PantryItem[],
    options: MealSuggestionRequest = {},
  ): Promise<MealSuggestionResult> {
    if (items.length === 0) {
      return { suggestions: [], prioritizedItems: [] };
    }

    // Drop expired items — the model shouldn't propose recipes using them.
    const pantry = items
      .filter((i) => i.status !== 'expired')
      .map(toSuggestionPayload);

    const { data, error } = await this.supabase.functions.invoke<MealSuggestionResult>(
      'suggest-meals',
      {
        body: {
          pantry,
          mealType: options.mealType,
          count: options.count ?? 3,
          dietary: options.dietary,
          notes: options.notes,
        },
      },
    );

    if (error) throw new Error(`Meal suggestion failed: ${error.message}`);
    if (!data) throw new Error('Meal suggestion returned no data');
    return data;
  }
}
