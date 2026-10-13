// Household model — supports multi-user households for shared features (shopping cart, etc.)

import type { PlanTier } from './subscription';

export type HouseholdRole = 'owner' | 'member';

export interface Household {
  id: string;
  name: string;
  /** Shared by every member */
  plan: PlanTier;
  /** Where the household shops, e.g. "Woodstock, GA" (any member can set it) */
  location: string | null;
  /** Postal code for local store prices, e.g. "30188" */
  postcode: string | null;
  /** Rounded (~100 m) for nearest-store lookups */
  latitude: number | null;
  longitude: number | null;
  /** Shopping habits and weekly budget (shared); read with readShopping */
  shopping: Record<string, unknown>;
  /** When the household setup (name, location, shopping, members) was finished */
  setupCompletedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: string;
  // Populated from profiles join (optional)
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

export interface CartItem {
  id: string;
  householdId: string;
  addedBy: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string | null;
  recipeId: string | null;
  checked: boolean;
  sortOrder: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated from profiles join (optional)
  addedByName?: string | null;
}

export const CART_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Canned & Jarred',
  'Grains & Pasta',
  'Snacks',
  'Beverages',
  'Condiments & Sauces',
  'Spices & Seasonings',
  'Other',
] as const;

export type CartCategory = (typeof CART_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Household rules shared by every client
// ---------------------------------------------------------------------------

/** Owners manage the household; members can only view it and leave. */
export function isOwner(members: HouseholdMember[], userId: string | null | undefined): boolean {
  return !!userId && members.some((m) => m.userId === userId && m.role === 'owner');
}

/** Owners first, then by join date — the order member lists are shown in. */
export function sortMembers(members: HouseholdMember[]): HouseholdMember[] {
  return [...members].sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner') || a.joinedAt.localeCompare(b.joinedAt));
}

/** Friendly text for errors raised by add_household_member_by_email. */
export function householdInviteErrorMessage(raw: string): string {
  if (raw.includes('user_not_found')) return "No Fuelify account uses that email yet. Ask them to sign up first, then add them.";
  if (raw.includes('already_member')) return 'That person is already in this household.';
  if (raw.includes('not_household_owner')) return 'Only the household owner can add members.';
  return raw;
}
