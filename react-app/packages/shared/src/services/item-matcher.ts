// Spoken or typed item → the product the household most likely means.
//
// Candidates come from three places, best first:
//   1. history: products this household picked before for the same item
//      (behavior_events → household_product_choice_stats)
//   2. pantry: what they have now, with its brand, aisle and shelf
//   3. stores: live results from the connected stores
// A store result for a product they've picked before is treated as history
// (with today's price and photo).

import { ingredientKey, categorizeIngredient } from './ingredients';
import { guessCategoryAndZone } from './receipt-parser';
import { offerPrice, type GroceryStoreId, type ProductOffer } from '../models/grocery';
import type { StorageZone } from '../models/pantry';

/** A product this household chose before for an item (one row of household_product_choice_stats). */
export interface ProductChoice {
  ingredientKey: string;
  store: string;
  productId: string;
  productName: string | null;
  timesChosen: number;
  avgPrice: number | null;
  lastAt: string | null;
}

export interface ItemMatch {
  source: 'history' | 'pantry' | 'store';
  /** Product name as the store or pantry has it */
  label: string;
  brand: string | null;
  size: string | null;
  store: GroceryStoreId | null;
  productId: string | null;
  /** What it costs now (after deals), or what they paid on average */
  price: number | null;
  imageUrl: string | null;
  category: string | null;
  storageZone: StorageZone | null;
  /** Times the household picked this product before */
  timesChosen: number;
  score: number;
}

const tokens = (s: string) => ingredientKey(s).split(' ').filter((t) => t.length > 1);
const squash = (s: string) => ingredientKey(s).replace(/\s+/g, '');

/** Share of the item's words found in a product name (0–1); "almond milk" matches "Almondmilk". */
export function nameCoverage(item: string, candidate: string): number {
  const want = tokens(item);
  if (want.length === 0) return 0;
  const have = squash(candidate);
  if (have.includes(squash(item))) return 1;
  return want.filter((t) => have.includes(t)).length / want.length;
}

/** Below this an option isn't about the same item */
const MIN_COVERAGE = 0.5;
/** Auto-pick the top option only when it clearly is the item */
const AUTO_PICK_COVERAGE = 0.99;

function placeOf(name: string): { category: string | null; storageZone: StorageZone | null } {
  const guess = guessCategoryAndZone(name);
  const key = ingredientKey(name);
  return { category: guess.category ?? (key ? categorizeIngredient(key) : null), storageZone: guess.storageZone ?? null };
}

export function rankItemMatches(
  itemName: string,
  sources: { history?: ProductChoice[]; pantry?: { name: string; brand: string | null; category: string | null; storageZone: StorageZone; unit: string | null }[]; offers?: ProductOffer[] },
): ItemMatch[] {
  const key = ingredientKey(itemName);
  const out = new Map<string, ItemMatch>();
  const put = (id: string, m: ItemMatch) => {
    const prev = out.get(id);
    if (!prev || m.score > prev.score) out.set(id, m);
  };

  const past = (sources.history ?? []).filter((h) => h.productName && (h.ingredientKey === key || nameCoverage(itemName, h.productName) >= MIN_COVERAGE));
  const pastById = new Map(past.map((h) => [`${h.store}:${h.productId}`, h]));

  for (const h of past) {
    const exact = h.ingredientKey === key;
    put(`${h.store}:${h.productId}`, {
      source: 'history',
      label: h.productName!,
      brand: null,
      size: null,
      store: h.store as GroceryStoreId,
      productId: h.productId,
      price: h.avgPrice,
      imageUrl: null,
      ...placeOf(h.productName!),
      timesChosen: h.timesChosen,
      score: 3 + (exact ? 1 : nameCoverage(itemName, h.productName!)) + Math.min(h.timesChosen, 5) * 0.2,
    });
  }

  for (const p of sources.pantry ?? []) {
    const coverage = nameCoverage(itemName, p.name);
    if (coverage < MIN_COVERAGE) continue;
    put(`pantry:${ingredientKey(p.name)}:${p.brand ?? ''}`, {
      source: 'pantry',
      label: p.name,
      brand: p.brand,
      size: null,
      store: null,
      productId: null,
      price: null,
      imageUrl: null,
      category: p.category,
      storageZone: p.storageZone,
      timesChosen: 0,
      score: 2 + coverage,
    });
  }

  const offers = sources.offers ?? [];
  const prices = offers.map(offerPrice);
  const [lo, hi] = [Math.min(...prices), Math.max(...prices)];
  offers.forEach((o, i) => {
    const coverage = nameCoverage(itemName, o.name);
    if (coverage < MIN_COVERAGE) return;
    const id = `${o.store}:${o.productId}`;
    const before = pastById.get(id);
    const cheapness = hi > lo ? (hi - offerPrice(o)) / (hi - lo) : 0;
    const base = {
      label: o.name,
      brand: o.brand,
      size: o.size,
      store: o.store,
      productId: o.productId,
      price: offerPrice(o),
      imageUrl: o.imageUrl,
      ...placeOf(o.name),
    };
    if (before) {
      // Their usual product, with today's price and photo
      put(id, { ...base, source: 'history', timesChosen: before.timesChosen, score: 3 + coverage + Math.min(before.timesChosen, 5) * 0.2 + 0.1 });
      return;
    }
    // Store order is the store's relevance; then cheaper and in stock
    put(id, { ...base, source: 'store', timesChosen: 0, score: coverage + 0.3 * cheapness + (o.inStock ? 0.1 : -0.3) - i * 0.02 });
  });

  return [...out.values()].sort((a, b) => b.score - a.score);
}

/** The option to fill in automatically, if one clearly fits. */
export function autoPick(itemName: string, matches: ItemMatch[]): ItemMatch | null {
  const top = matches[0];
  if (!top) return null;
  if (top.source !== 'store') return top;
  return nameCoverage(itemName, top.label) >= AUTO_PICK_COVERAGE ? top : null;
}

/** "Silk Unsweetened Almondmilk · 64 fl oz · Walmart $3.12" for notes. */
export function describeMatch(m: ItemMatch, storeName: (s: GroceryStoreId) => string = (s) => s): string {
  const where = m.store && m.price != null ? `${storeName(m.store)} $${m.price.toFixed(2)}` : m.store ? storeName(m.store) : null;
  return [m.label, m.size, where].filter(Boolean).join(' · ');
}
