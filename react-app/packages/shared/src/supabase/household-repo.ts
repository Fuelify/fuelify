// Household repository — Supabase/PostgreSQL
// Manages households and their members for shared features.

import type { TypedSupabaseClient } from './client';
import { fetchDisplayProfiles, type DisplayProfile } from './profile-names';
import type { HouseholdRow, HouseholdMemberRow } from './types';
import { toPlanTier, type PlanTier } from '../models/subscription';
import { householdInviteErrorMessage, type Household, type HouseholdMember, type HouseholdRole } from '../models/household';

function rowToHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    plan: toPlanTier(row.plan),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMember(row: HouseholdMemberRow, profile?: DisplayProfile): HouseholdMember {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    role: row.role as HouseholdRole,
    joinedAt: row.joined_at,
    firstName: profile?.firstName ?? null,
    lastName: profile?.lastName ?? null,
    imageUrl: profile?.imageUrl ?? null,
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
    // Insert without RETURNING: the SELECT policy needs membership, and the
    // owner membership row is only added by the AFTER INSERT trigger, so a
    // RETURNING clause would be rejected by RLS. Read the row back afterwards.
    const id = crypto.randomUUID();
    const { error } = await this.supabase
      .from('households')
      .insert({ id, name, created_by: userId });
    if (error) throw new Error(`Failed to create household: ${error.message}`);

    const { data, error: readError } = await this.supabase
      .from('households')
      .select('*')
      .eq('id', id)
      .single();
    if (readError) throw new Error(`Failed to load new household: ${readError.message}`);
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

  /**
   * Change the household's plan (owner only, enforced by RLS). There is no
   * billing yet, so this switches plans directly; once payments exist this
   * should move server-side behind the payment provider's webhook.
   */
  async setPlan(householdId: string, plan: PlanTier): Promise<Household> {
    const { data, error } = await this.supabase
      .from('households')
      .update({ plan })
      .eq('id', householdId)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Failed to change plan: ${error.message}`);
    // RLS filters the row out for non-owners instead of raising an error
    if (!data) throw new Error('Only the household owner can change the plan.');
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
      .select('*')
      .eq('household_id', householdId)
      .order('joined_at');

    if (error) throw new Error(`Failed to fetch household members: ${error.message}`);
    const rows = data ?? [];
    const profiles = await fetchDisplayProfiles(this.supabase, rows.map((r) => r.user_id));
    return rows.map((r) => rowToMember(r, profiles.get(r.user_id)));
  }

  /** Add a member to a household by user ID */
  async addMember(householdId: string, userId: string, role: HouseholdRole = 'member'): Promise<HouseholdMember> {
    const { data, error } = await this.supabase
      .from('household_members')
      .insert({ household_id: householdId, user_id: userId, role })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to add household member: ${error.message}`);
    const profiles = await fetchDisplayProfiles(this.supabase, [data.user_id]);
    return rowToMember(data, profiles.get(data.user_id));
  }

  /**
   * Add an existing user by email (owner only). The lookup runs server-side in
   * add_household_member_by_email because clients can't read auth.users.
   */
  async addMemberByEmail(householdId: string, email: string): Promise<HouseholdMember> {
    const { data, error } = await this.supabase.rpc('add_household_member_by_email', { hh_id: householdId, member_email: email });
    if (error) throw new Error(householdInviteErrorMessage(error.message));
    const row = data as HouseholdMemberRow;
    const profiles = await fetchDisplayProfiles(this.supabase, [row.user_id]);
    return rowToMember(row, profiles.get(row.user_id));
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
