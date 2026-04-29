// Household model — supports multi-user households for shared features (shopping cart, etc.)

export type HouseholdRole = 'owner' | 'member';

export interface Household {
  id: string;
  name: string;
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
