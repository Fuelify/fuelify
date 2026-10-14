// Pantry models — storage zone tracking with partial-open items and totals aggregation

export const STORAGE_ZONES = ['dry', 'cool', 'frozen'] as const;
export type StorageZone = (typeof STORAGE_ZONES)[number];

export const STORAGE_ZONE_LABELS: Record<StorageZone, string> = {
  dry: 'Dry',
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
  /** Product photo (from a barcode scan) */
  imageUrl: string | null;
  barcode: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated from profiles join
  addedByName?: string | null;
}

/** How much of one unit a group holds, e.g. 3 cans with 2.4 still on hand. */
export interface PantryAmount {
  /** null = a plain count */
  unit: string | null;
  quantity: number;
  /** Sealed packages count fully, open ones by % left, expired ones not at all */
  onHand: number;
}

/** Packages of the same thing (same normalized name) within a household */
export interface PantryItemTotal {
  /** Grouping key (normalized name) */
  key: string;
  /** The name most packages use */
  name: string;
  /** Sum of every package's quantity (all units; see `amounts` for per-unit totals) */
  totalQuantity: number;
  /** The most common unit */
  unit: string | null;
  /** Per-unit totals, largest first */
  amounts: PantryAmount[];
  /** Average % left of the open packages only (100 when none are open) */
  avgRemainingPct: number;
  /** Share of the group still usable, 0–100: on hand ÷ total, across units */
  onHandPct: number;
  itemCount: number;
  sealedCount: number;
  openCount: number;
  expiredCount: number;
  earliestExpiration: string | null;
  storageZones: StorageZone[];
  /** Use-first order: open (least left first), then sealed (soonest expiry first), then expired */
  items: PantryItem[];
  /** A product photo from any of the items */
  imageUrl: string | null;
}

// Store brands and sizes that don't change what an item is
const STORE_BRANDS = /^(?:kroger|great value|simple truth(?: organic)?|private selection|trader joe'?s|365(?: by whole foods(?: market)?)?|whole foods|kirkland(?: signature)?|good ?& ?gather|market pantry|publix|aldi|member'?s mark|signature select|o organics|wegmans|h-?e-?b|sprouts|food lion|clover valley|happy belly)\s+/i;
const SIZES = /\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|litres?|ct|count|pk|packs?|gal(?:lons?)?|qt|quarts?)\b\.?/gi;
const singular = (w: string) =>
  w.length > 3 && /ies$/.test(w) ? `${w.slice(0, -3)}y` : w.length > 3 && /(?:ches|shes|xes|oes)$/.test(w) ? w.slice(0, -2) : w.length > 3 && /s$/.test(w) && !/(?:us|is|ss)$/.test(w) ? w.slice(0, -1) : w;

/**
 * The key packages are grouped by: "Kroger Black Beans 15 oz" and
 * "black bean" are both "black bean".
 */
export function pantryGroupKey(name: string): string {
  const cleaned = name.trim().replace(STORE_BRANDS, '').replace(SIZES, ' ').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean).map(singular);
  return words.join(' ') || name.trim().toLowerCase();
}

const unitKey = (u: string | null) => (u ? singular(u.trim().toLowerCase().replace(/\.$/, '')) : null);
const round = (n: number) => Math.round(n * 100) / 100;

/** What's left of one package, in its own unit */
export function pantryOnHand(item: Pick<PantryItem, 'quantity' | 'status' | 'remainingPct'>): number {
  if (item.status === 'expired') return 0;
  return item.status === 'open' ? item.quantity * Math.max(0, Math.min(100, item.remainingPct)) / 100 : item.quantity;
}

const useFirst = (a: PantryItem, b: PantryItem) => {
  const rank = (i: PantryItem) => (i.status === 'open' ? 0 : i.status === 'sealed' ? 1 : 2);
  return rank(a) - rank(b)
    || (a.status === 'open' ? a.remainingPct - b.remainingPct : 0)
    || (a.expirationDate ?? '9999').localeCompare(b.expirationDate ?? '9999');
};

/** "2 cans + 1 lb"; with `onHand`, "2.4 of 3 cans". */
export function formatPantryAmounts(amounts: PantryAmount[], onHand = false): string {
  const n = (x: number) => String(round(x));
  return amounts
    .map((a) => {
      const unit = a.unit ? ` ${a.unit}` : '';
      return onHand && round(a.onHand) !== round(a.quantity) ? `${n(a.onHand)} of ${n(a.quantity)}${unit}` : `${n(a.quantity)}${unit}`;
    })
    .join(' + ');
}

/** Group packages of the same thing and total them. */
export function aggregatePantryItems(items: PantryItem[]): PantryItemTotal[] {
  const grouped = new Map<string, PantryItem[]>();
  for (const item of items) {
    const key = pantryGroupKey(item.name);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  const totals: PantryItemTotal[] = [];
  for (const [key, groupItems] of grouped) {
    // Name: the one most packages use, shortest on a tie
    const names = new Map<string, number>();
    for (const i of groupItems) names.set(i.name, (names.get(i.name) ?? 0) + 1);
    const capitalized = (x: string) => (/^[A-Z]/.test(x) ? 0 : 1);
    const best = [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || capitalized(a[0]) - capitalized(b[0]))[0][0];
    const name = best.replace(/^[a-z]/, (c) => c.toUpperCase());

    const byUnit = new Map<string | null, PantryAmount>();
    for (const i of groupItems) {
      const k = unitKey(i.unit);
      const a = byUnit.get(k) ?? { unit: i.unit?.trim() || null, quantity: 0, onHand: 0 };
      a.quantity += i.quantity;
      a.onHand += pantryOnHand(i);
      // Show the plural form when there's more than one
      if (i.unit && a.quantity > 1 && /s$/i.test(i.unit.trim())) a.unit = i.unit.trim();
      byUnit.set(k, a);
    }
    const amounts = [...byUnit.values()].map((a) => ({ ...a, quantity: round(a.quantity), onHand: round(a.onHand) })).sort((a, b) => b.quantity - a.quantity);
    const total = amounts.reduce((s, a) => s + a.quantity, 0);
    const open = groupItems.filter((i) => i.status === 'open');
    const expirations = groupItems
      .filter((i) => i.status !== 'expired')
      .map((i) => i.expirationDate)
      .filter((d): d is string => d !== null)
      .sort();

    totals.push({
      key,
      name,
      totalQuantity: round(groupItems.reduce((sum, i) => sum + i.quantity, 0)),
      unit: amounts[0]?.unit ?? null,
      amounts,
      avgRemainingPct: open.length ? Math.round(open.reduce((sum, i) => sum + i.remainingPct, 0) / open.length) : 100,
      onHandPct: total > 0 ? Math.round((amounts.reduce((s, a) => s + a.onHand, 0) / total) * 100) : 0,
      itemCount: groupItems.length,
      sealedCount: groupItems.filter((i) => i.status === 'sealed').length,
      openCount: open.length,
      expiredCount: groupItems.filter((i) => i.status === 'expired').length,
      earliestExpiration: expirations[0] ?? null,
      imageUrl: groupItems.find((i) => i.imageUrl)?.imageUrl ?? null,
      storageZones: [...new Set(groupItems.map((i) => i.storageZone))],
      items: [...groupItems].sort(useFirst),
    });
  }

  return totals.sort((a, b) => a.name.localeCompare(b.name));
}
