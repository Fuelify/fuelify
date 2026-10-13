// Writes behavior events (append-only; see models/behavior-event.ts).

import type { TypedSupabaseClient } from './client';
import { BEHAVIOR_SCHEMA_VERSION, type BehaviorContext, type BehaviorEvent } from '../models/behavior-event';
import type { ProductChoice } from '../services/item-matcher';

export interface BehaviorRow {
  event: BehaviorEvent;
  userId: string;
  sessionId: string;
  clientTs: string;
  context: BehaviorContext;
}

export class BehaviorRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  async insert(rows: BehaviorRow[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.supabase.from('behavior_events').insert(
      rows.map(({ event: e, userId, sessionId, clientTs, context }) => ({
        user_id: userId,
        // The database fills this from the user's membership when null
        household_id: e.householdId ?? null,
        event_type: e.type,
        surface: e.surface ?? null,
        client_ts: clientTs,
        session_id: sessionId,
        meal_id: e.mealId ?? null,
        meal_date: e.mealDate ?? null,
        meal_type: e.mealType ?? null,
        recipe_id: e.recipeId ?? null,
        recipe_title: e.recipeTitle ?? null,
        from_text: e.fromText ?? null,
        to_text: e.toText ?? null,
        from_key: e.fromKey ?? null,
        to_key: e.toKey ?? null,
        from_category: e.fromCategory ?? null,
        to_category: e.toCategory ?? null,
        suggestion_rank: e.suggestionRank ?? null,
        suggestion_count: e.suggestionCount ?? null,
        store: e.store ?? null,
        product_id: e.productId ?? null,
        product_name: e.productName ?? null,
        price: e.price ?? null,
        recommended: e.recommended ?? null,
        context: context as Record<string, unknown>,
        payload: e.payload ?? {},
        schema_version: BEHAVIOR_SCHEMA_VERSION,
      })),
    );
    if (error) throw new Error(`Failed to log behavior: ${error.message}`);
  }

  /** Products this household has picked, most often first (from household_product_choice_stats). */
  async productChoices(householdId: string, limit = 500): Promise<ProductChoice[]> {
    const { data, error } = await this.supabase
      .from('household_product_choice_stats')
      .select('ingredient_key, store, product_id, product_name, times_chosen, avg_price, last_at')
      .eq('household_id', householdId)
      .order('times_chosen', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to load shopping history: ${error.message}`);
    return (data ?? [])
      .filter((r) => r.ingredient_key && r.store && r.product_id)
      .map((r) => ({
        ingredientKey: r.ingredient_key!,
        store: r.store!,
        productId: r.product_id!,
        productName: r.product_name,
        timesChosen: Number(r.times_chosen ?? 0),
        avgPrice: r.avg_price == null ? null : Number(r.avg_price),
        lastAt: r.last_at,
      }));
  }
}
