// User profile repository — Supabase/PostgreSQL
// Manages the profiles table which extends Supabase Auth users

import type { TypedSupabaseClient } from './client';
import type { ProfileRow } from './types';

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  imageUrl: string | null;
  location: string | null;
  height: number | null;
  weight: number | null;
  birthdate: string | null;
  gender: string | null;
  genderDesc: string | null;
  diet: string | null;
  activeness: string | null;
  goals: Record<string, unknown>;
  shopping: Record<string, unknown>;
  allergens: string[];
  darkMode: boolean;
  units: string;
  plan: string;
  onboarded: boolean;
  onboardingStep: number;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    imageUrl: row.image_url,
    location: row.location,
    height: row.height,
    weight: row.weight,
    birthdate: row.birthdate,
    gender: row.gender,
    genderDesc: row.gender_desc,
    diet: row.diet,
    activeness: row.activeness,
    goals: row.goals ?? {},
    shopping: row.shopping ?? {},
    allergens: row.allergens ?? [],
    darkMode: row.dark_mode,
    units: row.units,
    plan: row.plan,
    onboarded: row.onboarded,
    onboardingStep: row.onboarding_step,
  };
}

export class ProfileRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  /** Get the current user's profile */
  async getProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
    return rowToProfile(data);
  }

  /** Update profile fields */
  async updateProfile(userId: string, updates: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    imageUrl: string;
    location: string;
    height: number;
    weight: number;
    birthdate: string;
    gender: string;
    genderDesc: string;
    diet: string;
    activeness: string;
    goals: Record<string, unknown>;
    shopping: Record<string, unknown>;
    allergens: string[];
    darkMode: boolean;
    units: string;
    plan: string;
    onboarded: boolean;
    onboardingStep: number;
  }>): Promise<UserProfile> {
    // Map camelCase fields to snake_case columns
    const dbUpdates: Record<string, unknown> = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.height !== undefined) dbUpdates.height = updates.height;
    if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
    if (updates.birthdate !== undefined) dbUpdates.birthdate = updates.birthdate;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.genderDesc !== undefined) dbUpdates.gender_desc = updates.genderDesc;
    if (updates.diet !== undefined) dbUpdates.diet = updates.diet;
    if (updates.activeness !== undefined) dbUpdates.activeness = updates.activeness;
    if (updates.goals !== undefined) dbUpdates.goals = updates.goals;
    if (updates.shopping !== undefined) dbUpdates.shopping = updates.shopping;
    if (updates.allergens !== undefined) dbUpdates.allergens = updates.allergens;
    if (updates.darkMode !== undefined) dbUpdates.dark_mode = updates.darkMode;
    if (updates.units !== undefined) dbUpdates.units = updates.units;
    if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
    if (updates.onboarded !== undefined) dbUpdates.onboarded = updates.onboarded;
    if (updates.onboardingStep !== undefined) dbUpdates.onboarding_step = updates.onboardingStep;

    const { data, error } = await this.supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return rowToProfile(data);
  }

  /** Mark onboarding as complete */
  async completeOnboarding(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ onboarded: true })
      .eq('id', userId);

    if (error) throw new Error(`Failed to complete onboarding: ${error.message}`);
  }
}
