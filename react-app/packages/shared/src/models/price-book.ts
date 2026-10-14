// The price book: what items cost at stores we have no price API for
// (Trader Joe's, Sprouts, Wegmans, Aldi…), from receipts and prices people
// log. A household's own prices come first; community medians (shown only
// once 2+ households agree on a store) fill the gaps.

import { ingredientKey } from '../services/ingredients';

export interface StoreChain {
  key: string;
  name: string;
  /** Matches how the store's name shows up on receipts */
  pattern: RegExp;
}

export const STORE_CHAINS: StoreChain[] = [
  { key: 'trader-joes', name: 'Trader Joe’s', pattern: /trader\s*jo/i },
  { key: 'sprouts', name: 'Sprouts', pattern: /sprouts/i },
  { key: 'wegmans', name: 'Wegmans', pattern: /wegman/i },
  { key: 'aldi', name: 'Aldi', pattern: /\baldi\b/i },
  { key: 'lidl', name: 'Lidl', pattern: /\blidl\b/i },
  { key: 'publix', name: 'Publix', pattern: /publix/i },
  { key: 'costco', name: 'Costco', pattern: /costco/i },
  { key: 'sams-club', name: 'Sam’s Club', pattern: /sam'?s\s*club/i },
  { key: 'bjs', name: 'BJ’s', pattern: /\bbj'?s\b/i },
  { key: 'target', name: 'Target', pattern: /\btarget\b/i },
  { key: 'walmart', name: 'Walmart', pattern: /wal-?\s*mart/i },
  { key: 'whole-foods', name: 'Whole Foods', pattern: /whole\s*foods/i },
  { key: 'heb', name: 'H-E-B', pattern: /\bh-?e-?b\b/i },
  { key: 'kroger', name: 'Kroger', pattern: /kroger|ralphs|fred\s*meyer|king\s*soopers|harris\s*teeter|fry'?s food|smith'?s food|\bqfc\b|mariano|dillons|food\s*4\s*less|pick\s*'?n\s*save|city\s*market/i },
  { key: 'safeway', name: 'Safeway', pattern: /safeway|albertsons|vons|jewel-?osco|shaw'?s|acme markets|tom thumb|randalls|pavilions/i },
  { key: 'food-lion', name: 'Food Lion', pattern: /food\s*lion/i },
  { key: 'giant', name: 'Giant', pattern: /\bgiant\b/i },
  { key: 'stop-and-shop', name: 'Stop & Shop', pattern: /stop\s*(&|and)\s*shop/i },
  { key: 'hannaford', name: 'Hannaford', pattern: /hannaford/i },
  { key: 'shoprite', name: 'ShopRite', pattern: /shop\s*rite/i },
  { key: 'meijer', name: 'Meijer', pattern: /meijer/i },
  { key: 'hy-vee', name: 'Hy-Vee', pattern: /hy-?\s*vee/i },
  { key: 'winn-dixie', name: 'Winn-Dixie', pattern: /winn-?\s*dixie/i },
  { key: 'ingles', name: 'Ingles', pattern: /ingles/i },
  { key: 'fresh-market', name: 'The Fresh Market', pattern: /fresh\s*market/i },
  { key: 'natural-grocers', name: 'Natural Grocers', pattern: /natural\s*grocers/i },
  { key: 'winco', name: 'WinCo', pattern: /winco/i },
  { key: 'save-a-lot', name: 'Save A Lot', pattern: /save\s*-?a\s*-?lot/i },
  { key: 'dollar-general', name: 'Dollar General', pattern: /dollar\s*general/i },
  { key: 'cvs', name: 'CVS', pattern: /\bcvs\b/i },
  { key: 'walgreens', name: 'Walgreens', pattern: /walgreens/i },
  { key: 'amazon-fresh', name: 'Amazon Fresh', pattern: /amazon\s*fresh/i },
];

/** Stores offered when logging a price, most common first. */
export const COMMON_STORE_KEYS = ['trader-joes', 'aldi', 'publix', 'sprouts', 'wegmans', 'costco', 'target', 'whole-foods', 'heb', 'safeway', 'lidl'];

/** "TRADER JOE'S #123 ATLANTA GA" → { key: 'trader-joes', name: 'Trader Joe’s' }; unknown stores keep their own name. */
export function normalizeStore(raw: string | null | undefined): { key: string; name: string } | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const chain = STORE_CHAINS.find((c) => c.pattern.test(text));
  if (chain) return { key: chain.key, name: chain.name };
  const name = text.replace(/[#№]\s*\d+.*$/, '').replace(/\s{2,}/g, ' ').trim().slice(0, 60);
  const key = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  if (!key) return null;
  return { key, name: name.split(' ').map((w) => (w === w.toUpperCase() && w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w)).join(' ') };
}

export const storeNameForKey = (key: string) => STORE_CHAINS.find((c) => c.key === key)?.name ?? null;

/** First three digits of a US ZIP, or null. */
export function zipRegion(zip: string | null | undefined): string | null {
  const m = (zip ?? '').match(/^\s*(\d{3})\d{2}/);
  return m ? m[1] : null;
}

/** The price of one unit from a receipt line: the unit price, or the line total ÷ quantity. */
export function linePrice(line: { unitPrice?: number | null; total?: number | null; quantity?: number | null }): number | null {
  const q = line.quantity && line.quantity > 0 ? line.quantity : 1;
  const p = line.unitPrice && line.unitPrice > 0 ? line.unitPrice : line.total && line.total > 0 ? line.total / q : null;
  return p == null || p >= 1000 ? null : Math.round(p * 100) / 100;
}

export interface PriceObservationDraft {
  storeKey: string;
  storeName: string;
  region: string | null;
  itemName: string;
  productName?: string | null;
  price: number;
  quantity?: number;
  size?: string | null;
  observedOn?: string;
  source: 'receipt' | 'manual';
  receiptId?: string | null;
}

export interface PriceObservation extends PriceObservationDraft {
  id: string;
  userId: string;
  householdId: string;
  itemKey: string;
  observedOn: string;
}

export interface CommunityPrice {
  itemKey: string;
  storeKey: string;
  storeName: string;
  scope: 'region' | 'national';
  medianPrice: number;
  observations: number;
  households: number;
  lastSeen: string;
}

/** One price for an item at a store, and where it came from. */
export interface PricePoint {
  itemKey: string;
  storeKey: string;
  storeName: string;
  price: number;
  /** 'yours' = your household paid it; 'nearby'/'national' = community median */
  basis: 'yours' | 'nearby' | 'national';
  /** How many prices it's based on */
  count: number;
  lastSeen: string;
  productName?: string | null;
  size?: string | null;
}

export const priceKey = (name: string) => ingredientKey(name);

const daysBetween = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/**
 * Best known price per (item, store): the household's most recent price if it's
 * under 120 days old, else the nearby community median, else the national one.
 */
export function pricePoints(own: PriceObservation[], community: CommunityPrice[], today = new Date().toISOString().slice(0, 10)): PricePoint[] {
  const best = new Map<string, PricePoint>();
  const rank = { yours: 0, nearby: 1, national: 2 } as const;
  const offer = (p: PricePoint) => {
    const k = `${p.itemKey}|${p.storeKey}`;
    const cur = best.get(k);
    if (!cur || rank[p.basis] < rank[cur.basis] || (rank[p.basis] === rank[cur.basis] && p.lastSeen > cur.lastSeen)) best.set(k, p);
  };
  const byItemStore = new Map<string, PriceObservation[]>();
  for (const o of own) {
    if (daysBetween(o.observedOn, today) > 120) continue;
    const k = `${o.itemKey}|${o.storeKey}`;
    byItemStore.set(k, [...(byItemStore.get(k) ?? []), o]);
  }
  for (const list of byItemStore.values()) {
    const latest = [...list].sort((a, b) => b.observedOn.localeCompare(a.observedOn))[0];
    offer({ itemKey: latest.itemKey, storeKey: latest.storeKey, storeName: latest.storeName, price: latest.price, basis: 'yours', count: list.length, lastSeen: latest.observedOn, productName: latest.productName, size: latest.size });
  }
  for (const c of community) {
    offer({ itemKey: c.itemKey, storeKey: c.storeKey, storeName: c.storeName, price: c.medianPrice, basis: c.scope === 'region' ? 'nearby' : 'national', count: c.observations, lastSeen: c.lastSeen });
  }
  return [...best.values()];
}

/** Every store's price for one item, cheapest first. */
export function pricesForItem(name: string, points: PricePoint[]): PricePoint[] {
  const key = priceKey(name);
  return points.filter((p) => p.itemKey === key).sort((a, b) => a.price - b.price);
}

export interface BasketEstimate {
  storeKey: string;
  storeName: string;
  /** Sum of the known prices (× quantity) */
  total: number;
  priced: number;
  missing: string[];
  lines: { name: string; quantity: number; point: PricePoint | null }[];
}

/** What a list costs at one store, from known prices (missing items listed, not guessed). */
export function estimateBasket(items: { name: string; quantity?: number }[], storeKey: string, points: PricePoint[]): BasketEstimate {
  const atStore = new Map(points.filter((p) => p.storeKey === storeKey).map((p) => [p.itemKey, p]));
  const lines = items.map((i) => ({ name: i.name, quantity: i.quantity && i.quantity > 0 ? i.quantity : 1, point: atStore.get(priceKey(i.name)) ?? null }));
  const known = lines.filter((l) => l.point);
  return {
    storeKey,
    storeName: points.find((p) => p.storeKey === storeKey)?.storeName ?? storeNameForKey(storeKey) ?? storeKey,
    total: Math.round(known.reduce((s, l) => s + l.point!.price * l.quantity, 0) * 100) / 100,
    priced: known.length,
    missing: lines.filter((l) => !l.point).map((l) => l.name),
    lines,
  };
}

/**
 * Compare every store that has prices for the list. Stores are ordered by how
 * many items they cover, then by the cost of the items they have in common
 * with the others, so a store that just knows fewer items doesn't look cheaper.
 */
export function compareStores(items: { name: string; quantity?: number }[], points: PricePoint[]): (BasketEstimate & { sharedTotal: number })[] {
  const stores = [...new Set(points.map((p) => p.storeKey))];
  const estimates = stores.map((s) => estimateBasket(items, s, points)).filter((e) => e.priced > 0);
  const priced = (e: BasketEstimate) => new Set(e.lines.filter((l) => l.point).map((l) => priceKey(l.name)));
  const common = estimates.length ? estimates.map(priced).reduce((a, b) => new Set([...a].filter((k) => b.has(k)))) : new Set<string>();
  return estimates
    .map((e) => ({ ...e, sharedTotal: Math.round(e.lines.filter((l) => l.point && common.has(priceKey(l.name))).reduce((s, l) => s + l.point!.price * l.quantity, 0) * 100) / 100 }))
    .sort((a, b) => b.priced - a.priced || a.sharedTotal - b.sharedTotal || a.total - b.total);
}
