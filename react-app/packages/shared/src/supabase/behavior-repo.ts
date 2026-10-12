// Writes behavior events (append-only; see models/behavior-event.ts).

import type { TypedSupabaseClient } from './client';
import { BEHAVIOR_SCHEMA_VERSION, type BehaviorContext, type BehaviorEvent } from '../models/behavior-event';

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
}
