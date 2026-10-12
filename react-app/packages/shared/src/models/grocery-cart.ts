// The household's store cart: the shopping list after analysis (pantry left
// out, priced, split by store). Saved in household_grocery.cart so choices
// stick until it's rebuilt.

import { offerPrice, type GroceryConfig, type GroceryStoreId, type ProductOffer } from './grocery';
import { effectivePrice, STORE_COST } from '../services/basket-optimizer';

export interface CartLine {
  /** Ingredient key (see ingredientKey) */
  key: string;
  /** What's needed, e.g. "ground turkey" */
  name: string;
  /** e.g. "2 lb" */
  amount: string;
  /** Meals it's for */
  recipes: string[];
  /** Products found for it, any store */
  options: ProductOffer[];
  /** What's in the cart; null when nothing was found or the user cleared it */
  choice: ProductOffer | null;
  /** Picked by the optimizer, or by the user (kept on rebuild) */
  chosenBy: 'auto' | 'user';
}

export interface GroceryCart {
  generatedAt: string;
  /** Plan days the cart covers */
  dates: string[];
  lines: CartLine[];
}

export interface CartStoreGroup {
  store: GroceryStoreId;
  lines: CartLine[];
  subtotal: number;
}

export interface CartSummary {
  stores: CartStoreGroup[];
  /** Lines with no product chosen */
  missing: CartLine[];
  total: number;
  dealSavings: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeCart(cart: GroceryCart): CartSummary {
  const groups = new Map<GroceryStoreId, CartLine[]>();
  const missing: CartLine[] = [];
  for (const line of cart.lines) {
    if (line.choice) groups.set(line.choice.store, [...(groups.get(line.choice.store) ?? []), line]);
    else missing.push(line);
  }
  const stores = [...groups.entries()]
    .map(([store, lines]) => ({ store, lines, subtotal: round2(lines.reduce((s, l) => s + offerPrice(l.choice!), 0)) }))
    .sort((a, b) => b.lines.length - a.lines.length);
  const chosen = cart.lines.filter((l) => l.choice).map((l) => l.choice!);
  return {
    stores,
    missing,
    total: round2(stores.reduce((s, g) => s + g.subtotal, 0)),
    dealSavings: round2(chosen.reduce((s, o) => s + (o.price - offerPrice(o)), 0)),
  };
}

/**
 * Best option for one line given the rest of the cart and the user's settings:
 * cheapest after preferences, with a store the cart doesn't use yet costing
 * extra (more under "Fewest stores", little under "Lowest price"), and stores
 * beyond the max allowed only as a last resort.
 */
export function recommendOffer(
  options: ProductOffer[],
  cart: GroceryCart | null,
  config: Pick<GroceryConfig, 'strategy' | 'maxStores' | 'preferOrganic' | 'preferStoreBrand'>,
  forKey?: string,
): ProductOffer | null {
  const inUse = new Set((cart?.lines ?? []).filter((l) => l.key !== forKey && l.choice).map((l) => l.choice!.store));
  const score = (o: ProductOffer) => {
    let s = effectivePrice(o, config);
    if (!inUse.has(o.store)) s += inUse.size >= config.maxStores ? 1000 : STORE_COST[config.strategy];
    return s;
  };
  return [...options].filter((o) => o.inStock && o.price > 0).sort((a, b) => score(a) - score(b))[0] ?? null;
}

const isOffer = (o: unknown): o is ProductOffer =>
  !!o && typeof o === 'object' && typeof (o as ProductOffer).store === 'string' && typeof (o as ProductOffer).price === 'number';

/** Lenient read of household_grocery.cart. */
export function readGroceryCart(raw: unknown): GroceryCart | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as GroceryCart).lines)) return null;
  const r = raw as GroceryCart;
  return {
    generatedAt: typeof r.generatedAt === 'string' ? r.generatedAt : new Date(0).toISOString(),
    dates: Array.isArray(r.dates) ? r.dates.filter((d) => typeof d === 'string') : [],
    lines: r.lines
      .filter((l) => l && typeof l.key === 'string' && typeof l.name === 'string')
      .map((l) => ({
        key: l.key,
        name: l.name,
        amount: typeof l.amount === 'string' ? l.amount : '',
        recipes: Array.isArray(l.recipes) ? l.recipes.filter((x) => typeof x === 'string') : [],
        options: Array.isArray(l.options) ? l.options.filter(isOffer) : [],
        choice: isOffer(l.choice) ? l.choice : null,
        chosenBy: l.chosenBy === 'user' ? 'user' : 'auto',
      })),
  };
}
