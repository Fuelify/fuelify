// Household repository — Supabase/PostgreSQL
// Manages households and their members for shared features.

import type { TypedSupabaseClient } from './client';
import type { HouseholdRow, HouseholdMemberRow } from './types';
import type { Household, HouseholdMember, HouseholdRole } from '../models/household';

function rowToHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMember(row: HouseholdMemberRow & { profiles?: { first_name: string | null; last_name: string | null; image_url: string | null } | null }): HouseholdMember {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    role: row.role as HouseholdRole,
    joinedAt: row.joined_at,
    firstName: row.profiles?.first_name ?? null,
    lastName: row.profiles?.last_name ?? null,
    imageUrl: row.profiles?.image_url ?? null,
  };
}

export class HouseholdRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  /** Get all households the user belongs to */
  async getMyHouseholds(userId: string): Promise<Household[]> {
    const { data, error } = await this.supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to fetch household memberships: ${error.message}`);
    if (!data || data.length === 0) return [];

    const householdIds = data.map((m) => m.household_id);
    const { data: households, error: hhError } = await this.supabase
      .from('households')
      .select('*')
      .in('id', householdIds)
      .order('created_at');

    if (hhError) throw new Error(`Failed to fetch households: ${hhError.message}`);
    return (households ?? []).map(rowToHousehold);
  }

  /** Create a new household (trigger auto-adds creator as owner) */
  async createHousehold(userId: string, name: string): Promise<Household> {
    const { data, error } = await this.supabase
      .from('households')
      .insert({ name, created_by: userId })
      .select()
      .single();

    if (error) throw new Error(`Failed to create household: ${error.message}`);
    return rowToHousehold(data);
  }

  /** Update household name */
  async updateHousehold(householdId: string, name: string): Promise<Household> {
    const { data, error } = await this.supabase
      .from('households')
      .update({ name })
      .eq('id', householdId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update household: ${error.message}`);
    return rowToHousehold(data);
  }

  /** Delete a household (owner only, cascades members + cart items) */
  async deleteHousehold(householdId: string): Promise<void> {
    const { error } = await this.supabase
      .from('households')
      .delete()
      .eq('id', householdId);

    if (error) throw new Error(`Failed to delete household: ${error.message}`);
  }

  /** Get members of a household (with profile info) */
  async getMembers(householdId: string): Promise<HouseholdMember[]> {
    const { data, error } = await this.supabase
      .from('household_members')
      .select('*, profiles(first_name, last_name, image_url)')
      .eq('household_id', householdId)
      .order('joined_at');

    if (error) throw new Error(`Failed to fetch household members: ${error.message}`);
    return (data ?? []).map(rowToMember);
  }

  /** Add a member to a household by user ID */
  async addMember(householdId: string, userId: string, role: HouseholdRole = 'member'): Promise<HouseholdMember> {
    const { data, error } = await this.supabase
      .from('household_members')
      .insert({ household_id: householdId, user_id: userId, role })
      .select('*, profiles(first_name, last_name, image_url)')
      .single();

    if (error) throw new Error(`Failed to add household member: ${error.message}`);
    return rowToMember(data);
  }

  /** Remove a member from a household */
  async removeMember(householdId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('household_members')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to remove household member: ${error.message}`);
  }

  /** Update a member's role */
  async updateMemberRole(householdId: string, userId: string, role: HouseholdRole): Promise<void> {
    const { error } = await this.supabase
      .from('household_members')
      .update({ role })
      .eq('household_id', householdId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to update member role: ${error.message}`);
  }
}
