// Pantry repository — Supabase/PostgreSQL
// Items scoped to a household with storage zone and partial-open tracking.

import type { TypedSupabaseClient } from './client';
import type { PantryItemRow } from './types';
import type { PantryItem, StorageZone, ItemStatus } from '../models/pantry';

function rowToItem(row: PantryItemRow & { profiles?: { first_name: string | null; last_name: string | null } | null }): PantryItem {
  const firstName = row.profiles?.first_name ?? '';
  const lastName = row.profiles?.last_name ?? '';
  const addedByName = [firstName, lastName].filter(Boolean).join(' ') || null;

  return {
    id: row.id,
    householdId: row.household_id,
    addedBy: row.added_by,
    name: row.name,
    brand: row.brand,
    category: row.category,
    storageZone: row.storage_zone as StorageZone,
    quantity: row.quantity,
    unit: row.unit,
    remainingPct: row.remaining_pct,
    status: row.status as ItemStatus,
    purchaseDate: row.purchase_date,
    expirationDate: row.expiration_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    addedByName,
  };
}

export class PantryRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  /** Get all pantry items for a household */
  async getItems(householdId: string): Promise<PantryItem[]> {
    const { data, error } = await this.supabase
      .from('pantry_items')
      .select('*, profiles(first_name, last_name)')
      .eq('household_id', householdId)
      .order('storage_zone')
      .order('name');

    if (error) throw new Error(`Failed to fetch pantry items: ${error.message}`);
    return (data ?? []).map(rowToItem);
  }

  /** Get pantry items filtered by storage zone */
  async getItemsByZone(householdId: string, zone: StorageZone): Promise<PantryItem[]> {
    const { data, error } = await this.supabase
      .from('pantry_items')
      .select('*, profiles(first_name, last_name)')
      .eq('household_id', householdId)
      .eq('storage_zone', zone)
      .order('name');

    if (error) throw new Error(`Failed to fetch pantry items by zone: ${error.message}`);
    return (data ?? []).map(rowToItem);
  }

  /** Add a pantry item */
  async addItem(householdId: string, userId: string, item: {
    name: string;
    brand?: string;
    category?: string;
    storageZone?: StorageZone;
    quantity?: number;
    unit?: string;
    remainingPct?: number;
    status?: ItemStatus;
    purchaseDate?: string;
    expirationDate?: string;
    notes?: string;
  }): Promise<PantryItem> {
    const { data, error } = await this.supabase
      .from('pantry_items')
      .insert({
        household_id: householdId,
        added_by: userId,
        name: item.name,
        brand: item.brand ?? null,
        category: item.category ?? null,
        storage_zone: item.storageZone ?? 'dry',
        quantity: item.quantity ?? 1,
        unit: item.unit ?? null,
        remaining_pct: item.remainingPct ?? 100,
        status: item.status ?? 'sealed',
        purchase_date: item.purchaseDate ?? null,
        expiration_date: item.expirationDate ?? null,
        notes: item.notes ?? null,
      })
      .select('*, profiles(first_name, last_name)')
      .single();

    if (error) throw new Error(`Failed to add pantry item: ${error.message}`);
    return rowToItem(data);
  }

  /** Update a pantry item */
  async updateItem(itemId: string, updates: {
    name?: string;
    brand?: string | null;
    category?: string | null;
    storageZone?: StorageZone;
    quantity?: number;
    unit?: string | null;
    remainingPct?: number;
    status?: ItemStatus;
    purchaseDate?: string | null;
    expirationDate?: string | null;
    notes?: string | null;
  }): Promise<PantryItem> {
    const { data, error } = await this.supabase
      .from('pantry_items')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.brand !== undefined && { brand: updates.brand }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.storageZone !== undefined && { storage_zone: updates.storageZone }),
        ...(updates.quantity !== undefined && { quantity: updates.quantity }),
        ...(updates.unit !== undefined && { unit: updates.unit }),
        ...(updates.remainingPct !== undefined && { remaining_pct: updates.remainingPct }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.purchaseDate !== undefined && { purchase_date: updates.purchaseDate }),
        ...(updates.expirationDate !== undefined && { expiration_date: updates.expirationDate }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
      })
      .eq('id', itemId)
      .select('*, profiles(first_name, last_name)')
      .single();

    if (error) throw new Error(`Failed to update pantry item: ${error.message}`);
    return rowToItem(data);
  }

  /** Delete a pantry item */
  async deleteItem(itemId: string): Promise<void> {
    const { error } = await this.supabase
      .from('pantry_items')
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`Failed to delete pantry item: ${error.message}`);
  }

  /** Delete all expired items from a household */
  async clearExpired(householdId: string): Promise<void> {
    const { error } = await this.supabase
      .from('pantry_items')
      .delete()
      .eq('household_id', householdId)
      .eq('status', 'expired');

    if (error) throw new Error(`Failed to clear expired items: ${error.message}`);
  }
}
