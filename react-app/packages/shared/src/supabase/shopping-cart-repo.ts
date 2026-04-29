// Shopping cart repository — Supabase/PostgreSQL
// Cart items are scoped to a household so all members share the same list.

import type { TypedSupabaseClient } from './client';
import type { ShoppingCartItemRow } from './types';
import type { CartItem } from '../models/household';

function rowToCartItem(row: ShoppingCartItemRow & { profiles?: { first_name: string | null; last_name: string | null } | null }): CartItem {
  const firstName = row.profiles?.first_name ?? '';
  const lastName = row.profiles?.last_name ?? '';
  const addedByName = [firstName, lastName].filter(Boolean).join(' ') || null;

  return {
    id: row.id,
    householdId: row.household_id,
    addedBy: row.added_by,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    recipeId: row.recipe_id,
    checked: row.checked,
    sortOrder: row.sort_order,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    addedByName,
  };
}

export class ShoppingCartRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  /** Get all cart items for a household */
  async getItems(householdId: string): Promise<CartItem[]> {
    const { data, error } = await this.supabase
      .from('shopping_cart_items')
      .select('*, profiles(first_name, last_name)')
      .eq('household_id', householdId)
      .order('checked')
      .order('sort_order')
      .order('created_at');

    if (error) throw new Error(`Failed to fetch cart items: ${error.message}`);
    return (data ?? []).map(rowToCartItem);
  }

  /** Add an item to the cart */
  async addItem(householdId: string, userId: string, item: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    recipeId?: string;
    notes?: string;
  }): Promise<CartItem> {
    const { data, error } = await this.supabase
      .from('shopping_cart_items')
      .insert({
        household_id: householdId,
        added_by: userId,
        name: item.name,
        quantity: item.quantity ?? 1,
        unit: item.unit ?? null,
        category: item.category ?? null,
        recipe_id: item.recipeId ?? null,
        notes: item.notes ?? null,
      })
      .select('*, profiles(first_name, last_name)')
      .single();

    if (error) throw new Error(`Failed to add cart item: ${error.message}`);
    return rowToCartItem(data);
  }

  /** Update a cart item */
  async updateItem(itemId: string, updates: {
    name?: string;
    quantity?: number;
    unit?: string | null;
    category?: string | null;
    checked?: boolean;
    sortOrder?: number;
    notes?: string | null;
  }): Promise<CartItem> {
    const { data, error } = await this.supabase
      .from('shopping_cart_items')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.quantity !== undefined && { quantity: updates.quantity }),
        ...(updates.unit !== undefined && { unit: updates.unit }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.checked !== undefined && { checked: updates.checked }),
        ...(updates.sortOrder !== undefined && { sort_order: updates.sortOrder }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
      })
      .eq('id', itemId)
      .select('*, profiles(first_name, last_name)')
      .single();

    if (error) throw new Error(`Failed to update cart item: ${error.message}`);
    return rowToCartItem(data);
  }

  /** Toggle the checked state of a cart item */
  async toggleItem(itemId: string, checked: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('shopping_cart_items')
      .update({ checked })
      .eq('id', itemId);

    if (error) throw new Error(`Failed to toggle cart item: ${error.message}`);
  }

  /** Delete a cart item */
  async deleteItem(itemId: string): Promise<void> {
    const { error } = await this.supabase
      .from('shopping_cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`Failed to delete cart item: ${error.message}`);
  }

  /** Clear all checked items from the cart */
  async clearChecked(householdId: string): Promise<void> {
    const { error } = await this.supabase
      .from('shopping_cart_items')
      .delete()
      .eq('household_id', householdId)
      .eq('checked', true);

    if (error) throw new Error(`Failed to clear checked items: ${error.message}`);
  }

  /** Clear all items from the cart */
  async clearAll(householdId: string): Promise<void> {
    const { error } = await this.supabase
      .from('shopping_cart_items')
      .delete()
      .eq('household_id', householdId);

    if (error) throw new Error(`Failed to clear cart: ${error.message}`);
  }
}
