// Basket optimizer: given offers from each store for every shopping-list item,
// choose where to buy what. Trades total cost against the number of stores
// (the user's strategy), and honours organic / store-brand preferences.

import { offerPrice, type GroceryConfig, type GroceryStoreId, type ProductOffer } from '../models/grocery';

export interface BasketItem {
  key: string;
  name: string;
}

export interface BasketPick {
  item: BasketItem;
  offer: ProductOffer;
}

export interface StoreBasket {
  store: GroceryStoreId;
  picks: BasketPick[];
  /** What you pay, with deals */
  subtotal: number;
}

export interface OptimizedBasket {
  stores: StoreBasket[];
  /** Items no chosen store had */
  missing: BasketItem[];
  total: number;
  /** Saved by deals in this basket (regular minus promo prices) */
  dealSavings: number;
  /** Saved versus buying everything at the single cheapest store that has it all, when that's more */
  vsOneStore: number | null;
}

/** Extra "cost" of each additional store, by strategy (USD-equivalent). */
const STORE_COST: Record<GroceryConfig['strategy'], number> = { cheapest: 0.5, balanced: 4, 'fewest-stores': 15 };
/** Leaving an item out costs more than any sensible price difference. */
const MISSING_COST = 25;

/** The price used to compare offers: real price nudged by preferences (never what's charged). */
export function effectivePrice(offer: ProductOffer, config: Pick<GroceryConfig, 'preferOrganic' | 'preferStoreBrand'>): number {
  let p = offerPrice(offer);
  if (config.preferOrganic && offer.organic) p *= 0.85;
  if (config.preferStoreBrand && offer.storeBrand) p *= 0.9;
  return p;
}

function subsets<T>(items: T[], maxSize: number): T[][] {
  const out: T[][] = [];
  const walk = (start: number, acc: T[]) => {
    if (acc.length) out.push([...acc]);
    if (acc.length === maxSize) return;
    for (let i = start; i < items.length; i++) walk(i + 1, [...acc, items[i]]);
  };
  walk(0, []);
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function optimizeBasket(
  items: BasketItem[],
  offers: Record<string, ProductOffer[]>,
  config: Pick<GroceryConfig, 'strategy' | 'maxStores' | 'preferOrganic' | 'preferStoreBrand'>,
): OptimizedBasket {
  const usable = (key: string) => (offers[key] ?? []).filter((o) => o.inStock && o.price > 0);
  const storesWithOffers = [...new Set(items.flatMap((i) => usable(i.key).map((o) => o.store)))];

  // Cheapest (by preference-adjusted price) offer per item within a set of stores
  const bestIn = (item: BasketItem, stores: Set<GroceryStoreId>) =>
    usable(item.key)
      .filter((o) => stores.has(o.store))
      .sort((a, b) => effectivePrice(a, config) - effectivePrice(b, config))[0];

  const evaluate = (stores: GroceryStoreId[]) => {
    const set = new Set(stores);
    const picks: BasketPick[] = [];
    const missing: BasketItem[] = [];
    let objective = 0;
    for (const item of items) {
      const offer = bestIn(item, set);
      if (offer) {
        picks.push({ item, offer });
        objective += effectivePrice(offer, config);
      } else {
        missing.push(item);
        objective += MISSING_COST;
      }
    }
    // Only count stores actually used
    const used = new Set(picks.map((p) => p.offer.store));
    objective += Math.max(0, used.size - 1) * STORE_COST[config.strategy];
    return { picks, missing, objective };
  };

  let best = { picks: [] as BasketPick[], missing: items, objective: Infinity };
  for (const combo of subsets(storesWithOffers, Math.max(1, config.maxStores))) {
    const result = evaluate(combo);
    if (result.objective < best.objective - 1e-9) best = result;
  }
  if (best.objective === Infinity) best = { picks: [], missing: items, objective: 0 };

  const byStore = new Map<GroceryStoreId, BasketPick[]>();
  for (const pick of best.picks) byStore.set(pick.offer.store, [...(byStore.get(pick.offer.store) ?? []), pick]);
  const stores = [...byStore.entries()]
    .map(([store, picks]) => ({ store, picks, subtotal: round2(picks.reduce((sum, p) => sum + offerPrice(p.offer), 0)) }))
    .sort((a, b) => b.picks.length - a.picks.length);
  const total = round2(stores.reduce((sum, s) => sum + s.subtotal, 0));
  const dealSavings = round2(best.picks.reduce((sum, p) => sum + (p.offer.price - offerPrice(p.offer)), 0));

  // Compare with one-stop shopping where a single store covers everything we found
  const oneStoreTotals = storesWithOffers
    .map((store) => evaluate([store]))
    .filter((r) => r.missing.length === best.missing.length)
    .map((r) => r.picks.reduce((sum, p) => sum + offerPrice(p.offer), 0));
  const cheapestOneStore = oneStoreTotals.length ? Math.min(...oneStoreTotals) : null;
  const vsOneStore = cheapestOneStore != null && cheapestOneStore - total > 0.005 ? round2(cheapestOneStore - total) : null;

  return { stores, missing: best.missing, total, dealSavings, vsOneStore };
}
