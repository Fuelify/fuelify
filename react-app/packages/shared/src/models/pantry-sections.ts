// Pantry layout: each storage zone (dry, fridge, freezer) split into aisle
// categories, e.g. Dry → Grains & Pasta, Canned & Jarred, Baking…

import { PANTRY_CATEGORIES, STORAGE_ZONES, type PantryCategory, type PantryItem, type PantryItemTotal, type StorageZone } from './pantry';
import { guessCategoryAndZone } from '../services/receipt-parser';
import { categorizeIngredient, ingredientKey } from '../services/ingredients';

/** The order categories are shown in, per zone; anything else follows, then Other. */
export const ZONE_CATEGORY_ORDER: Record<StorageZone, PantryCategory[]> = {
  dry: ['Grains & Pasta', 'Canned & Jarred', 'Baking', 'Spices & Seasonings', 'Condiments & Sauces', 'Snacks', 'Beverages', 'Bread & Bakery', 'Produce'],
  cool: ['Produce', 'Dairy', 'Eggs', 'Meat & Seafood', 'Deli', 'Condiments & Sauces', 'Beverages', 'Bread & Bakery'],
  frozen: ['Frozen Meals', 'Frozen Vegetables', 'Frozen Fruit', 'Meat & Seafood', 'Bread & Bakery'],
};

const FROM_AISLE: Record<string, PantryCategory> = {
  Bakery: 'Bread & Bakery',
  Frozen: 'Frozen Meals',
};

const SHELF_CANNED = /\b(broth|stock|soups?|canned|cans?|beans?|chickpeas?|lentil soup|tomato (?:sauce|paste)|(?:diced|crushed|whole peeled) tomatoes|tuna|salmon|sardines?|chili|coconut milk|evaporated milk|condensed milk)\b/i;

const isPantryCategory = (c: string): c is PantryCategory => (PANTRY_CATEGORIES as readonly string[]).includes(c);

/** An item's category: what it was saved with, else a guess from its name. */
export function pantryCategoryOf(item: Pick<PantryItem, 'name' | 'category' | 'storageZone'>): PantryCategory {
  if (item.category && isPantryCategory(item.category)) return item.category;
  // On the shelf, "chicken broth" or "tuna" is a can, not meat
  if (item.storageZone === 'dry' && SHELF_CANNED.test(item.name)) return 'Canned & Jarred';
  const guessed = guessCategoryAndZone(item.name).category;
  if (guessed) return guessed;
  const aisle = categorizeIngredient(ingredientKey(item.name));
  const mapped = FROM_AISLE[aisle] ?? (isPantryCategory(aisle) ? aisle : 'Other');
  // Frozen items the name can't place stay with the freezer's meals, not "Other"
  return mapped === 'Other' && item.storageZone === 'frozen' ? 'Frozen Meals' : mapped;
}

export interface PantryCategorySection {
  category: PantryCategory;
  totals: PantryItemTotal[];
}

export interface PantryZoneSection {
  zone: StorageZone;
  count: number;
  categories: PantryCategorySection[];
}

/** Totals grouped by zone, then category (in ZONE_CATEGORY_ORDER), names A→Z inside each. */
export function pantrySections(totals: PantryItemTotal[], zone: StorageZone | 'all' = 'all'): PantryZoneSection[] {
  const zones = zone === 'all' ? STORAGE_ZONES : [zone];
  return zones
    .map((z) => {
      const inZone = totals
        .map((t) => ({ t, items: t.items.filter((i) => i.storageZone === z) }))
        .filter((x) => x.items.length > 0);
      const byCategory = new Map<PantryCategory, PantryItemTotal[]>();
      for (const { t, items } of inZone) {
        // The most common category among its packages
        const counts = new Map<PantryCategory, number>();
        for (const i of items) {
          const c = pantryCategoryOf(i);
          counts.set(c, (counts.get(c) ?? 0) + 1);
        }
        const category = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        byCategory.set(category, [...(byCategory.get(category) ?? []), t]);
      }
      const order = ZONE_CATEGORY_ORDER[z];
      const rank = (c: PantryCategory) => (c === 'Other' ? 1000 : order.includes(c) ? order.indexOf(c) : 100 + PANTRY_CATEGORIES.indexOf(c));
      const categories = [...byCategory.entries()]
        .sort((a, b) => rank(a[0]) - rank(b[0]))
        .map(([category, list]) => ({ category, totals: list.sort((a, b) => a.name.localeCompare(b.name)) }));
      return { zone: z, count: inZone.length, categories };
    })
    .filter((s) => s.count > 0);
}
