// Household grocery state: the built store cart and skipped list items.

import type { TypedSupabaseClient } from './client';
import { readGroceryCart, type GroceryCart } from '../models/grocery-cart';

export interface HouseholdGrocery {
  cart: GroceryCart | null;
  skippedKeys: string[];
}

export class GroceryRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  async get(householdId: string): Promise<HouseholdGrocery> {
    const { data, error } = await this.supabase.from('household_grocery').select('cart, skipped_keys').eq('household_id', householdId).maybeSingle();
    if (error) throw new Error(`Failed to load grocery cart: ${error.message}`);
    return { cart: readGroceryCart(data?.cart), skippedKeys: data?.skipped_keys ?? [] };
  }

  async save(householdId: string, userId: string, updates: { cart?: GroceryCart | null; skippedKeys?: string[] }): Promise<void> {
    const row: { household_id: string; updated_by: string; cart?: Record<string, unknown> | null; skipped_keys?: string[] } = { household_id: householdId, updated_by: userId };
    if (updates.cart !== undefined) row.cart = updates.cart as unknown as Record<string, unknown> | null;
    if (updates.skippedKeys !== undefined) row.skipped_keys = updates.skippedKeys;
    const { error } = await this.supabase.from('household_grocery').upsert(row, { onConflict: 'household_id' });
    if (error) throw new Error(`Failed to save grocery cart: ${error.message}`);
  }
}
