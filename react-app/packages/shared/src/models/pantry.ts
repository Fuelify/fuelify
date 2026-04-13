// Pantry models — storage zone tracking with partial-open items and totals aggregation

export const STORAGE_ZONES = ['dry', 'cool', 'frozen'] as const;
export type StorageZone = (typeof STORAGE_ZONES)[number];

export const STORAGE_ZONE_LABELS: Record<StorageZone, string> = {
  dry: 'Dry / Pantry',
  cool: 'Fridge',
  frozen: 'Freezer',
};

export const ITEM_STATUSES = ['sealed', 'open', 'expired'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const PANTRY_CATEGORIES = [
  'Grains & Pasta',
  'Canned & Jarred',
  'Snacks',
  'Baking',
  'Condiments & Sauces',
  'Spices & Seasonings',
  'Dairy',
  'Eggs',
  'Meat & Seafood',
  'Produce',
  'Beverages',
  'Frozen Meals',
  'Frozen Vegetables',
  'Frozen Fruit',
  'Bread & Bakery',
  'Deli',
  'Other',
] as const;

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

export interface PantryItem {
  id: string;
  householdId: string;
  addedBy: string;
  name: string;
  brand: string | null;
  category: string | null;
  storageZone: StorageZone;
  quantity: number;
  unit: string | null;
  remainingPct: number; // 0-100
  status: ItemStatus;
  purchaseDate: string | null;
  expirationDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated from profiles join
  addedByName?: string | null;
}

/** Aggregated totals for items sharing the same name within a household */
export interface PantryItemTotal {
  name: string;
  totalQuantity: number;
  unit: string | null;
  avgRemainingPct: number;
  itemCount: number;
  sealedCount: number;
  openCount: number;
  expiredCount: number;
  earliestExpiration: string | null;
  storageZones: StorageZone[];
  items: PantryItem[];
}

/** Aggregate pantry items by name */
export function aggregatePantryItems(items: PantryItem[]): PantryItemTotal[] {
  const grouped = new Map<string, PantryItem[]>();
  for (const item of items) {
    const key = item.name.toLowerCase();
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  const totals: PantryItemTotal[] = [];
  for (const [, groupItems] of grouped) {
    const totalQuantity = groupItems.reduce((sum, i) => sum + i.quantity, 0);
    const avgRemainingPct = Math.round(
      groupItems.reduce((sum, i) => sum + i.remainingPct, 0) / groupItems.length,
    );
    const expirations = groupItems
      .map((i) => i.expirationDate)
      .filter((d): d is string => d !== null)
      .sort();
    const zones = [...new Set(groupItems.map((i) => i.storageZone))];

    totals.push({
      name: groupItems[0].name,
      totalQuantity,
      unit: groupItems[0].unit,
      avgRemainingPct,
      itemCount: groupItems.length,
      sealedCount: groupItems.filter((i) => i.status === 'sealed').length,
      openCount: groupItems.filter((i) => i.status === 'open').length,
      expiredCount: groupItems.filter((i) => i.status === 'expired').length,
      earliestExpiration: expirations[0] ?? null,
      storageZones: zones,
      items: groupItems,
    });
  }

  return totals.sort((a, b) => a.name.localeCompare(b.name));
}
