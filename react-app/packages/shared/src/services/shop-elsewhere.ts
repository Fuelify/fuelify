// The simple fallback for stores without an API (Aldi, Publix, Costco, Target…):
// share the list as text, and open each item in the store's own search.

import { normalizeStore } from '../models/price-book';

/** Ids match the price book's store keys, so prices line up. */
export type ShopElsewhereStore =
  | 'aldi' | 'trader-joes' | 'publix' | 'sprouts' | 'wegmans' | 'costco' | 'target' | 'whole-foods' | 'walmart' | 'kroger' | 'instacart' | 'other';

export const SHOP_ELSEWHERE_STORES: { id: ShopElsewhereStore; name: string }[] = [
  { id: 'aldi', name: 'Aldi' },
  { id: 'trader-joes', name: 'Trader Joe’s' },
  { id: 'publix', name: 'Publix' },
  { id: 'sprouts', name: 'Sprouts' },
  { id: 'wegmans', name: 'Wegmans' },
  { id: 'costco', name: 'Costco' },
  { id: 'target', name: 'Target' },
  { id: 'whole-foods', name: 'Whole Foods' },
  { id: 'walmart', name: 'Walmart' },
  { id: 'kroger', name: 'Kroger' },
  { id: 'instacart', name: 'Instacart' },
  { id: 'other', name: 'Other (web search)' },
];

const SEARCH: Record<ShopElsewhereStore, (q: string) => string> = {
  aldi: (q) => `https://www.aldi.us/results?q=${q}`,
  'trader-joes': (q) => `https://www.traderjoes.com/home/search?q=${q}&section=products`,
  publix: (q) => `https://www.publix.com/search?searchTerm=${q}`,
  sprouts: (q) => `https://shop.sprouts.com/search?search_term=${q}`,
  wegmans: (q) => `https://shop.wegmans.com/search?search_term=${q}`,
  'whole-foods': (q) => `https://www.wholefoodsmarket.com/search?text=${q}`,
  costco: (q) => `https://www.costco.com/CatalogSearch?keyword=${q}`,
  target: (q) => `https://www.target.com/s?searchTerm=${q}`,
  walmart: (q) => `https://www.walmart.com/search?q=${q}`,
  kroger: (q) => `https://www.kroger.com/search?query=${q}`,
  instacart: (q) => `https://www.instacart.com/store/s?k=${q}`,
  other: (q) => `https://www.google.com/search?q=${q}`,
};

/** The store's own search for an item. */
export function storeSearchUrl(store: ShopElsewhereStore, item: string): string {
  const q = encodeURIComponent(item.trim().replace(/\s+/g, ' '));
  return SEARCH[store](store === 'other' ? `${q}%20grocery` : q);
}

/** Best guess at a store from free text, e.g. the household's Instacart retailer "Publix" → 'publix'. */
export function guessShopElsewhereStore(name: string | null | undefined): ShopElsewhereStore {
  const key = normalizeStore(name)?.key;
  return SHOP_ELSEWHERE_STORES.find((s) => s.id !== 'other' && s.id === key)?.id ?? 'aldi';
}

export interface ShareableItem {
  name: string;
  /** e.g. "2 lb", "×3" */
  amount?: string | null;
  /** Aisle/category to group by */
  group?: string | null;
}

/**
 * A list as plain text for a text message or notes app:
 * "Groceries (3)\n\nProduce\n☐ bananas — 6\n…". Same names combined, grouped
 * when groups are given.
 */
export function listAsText(items: ShareableItem[], title = 'Groceries'): string {
  const seen = new Map<string, ShareableItem>();
  for (const i of items) {
    const name = i.name.trim();
    if (!name) continue;
    const k = name.toLowerCase();
    const prev = seen.get(k);
    if (!prev) seen.set(k, { ...i, name });
    else if (i.amount && i.amount !== prev.amount) prev.amount = [prev.amount, i.amount].filter(Boolean).join(' + ');
  }
  const all = [...seen.values()];
  const line = (i: ShareableItem) => `☐ ${i.name}${i.amount ? ` — ${i.amount}` : ''}`;
  const groups = new Map<string, ShareableItem[]>();
  for (const i of all) groups.set(i.group ?? '', [...(groups.get(i.group ?? '') ?? []), i]);
  const body = groups.size <= 1 || !all.some((i) => i.group)
    ? all.map(line).join('\n')
    : [...groups.entries()]
        .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
        .map(([g, list]) => [g || 'Other', ...list.map(line)].join('\n'))
        .join('\n\n');
  return `${title} (${all.length})\n\n${body}`.trim();
}
