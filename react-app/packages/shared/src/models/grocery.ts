// Grocery store connections (Premium): which stores to shop, and how to
// balance price against the number of stores. Stored in profiles.grocery_config.

export const GROCERY_STORES = ['kroger', 'walmart', 'instacart'] as const;
export type GroceryStoreId = (typeof GROCERY_STORES)[number];

export interface GroceryStoreInfo {
  id: GroceryStoreId;
  name: string;
  /** Can we look up prices there? (Instacart has no price search.) */
  prices: boolean;
  /** How a basket gets to the store */
  checkout: 'cart-link' | 'shopping-list' | 'product-links';
  note: string;
}

export const GROCERY_STORE_INFO: Record<GroceryStoreId, GroceryStoreInfo> = {
  kroger: { id: 'kroger', name: 'Kroger', prices: true, checkout: 'cart-link', note: 'Local prices and weekly deals at your nearest Kroger-family store; adds to your Kroger cart once you connect your account.' },
  walmart: { id: 'walmart', name: 'Walmart', prices: true, checkout: 'cart-link', note: 'Prices from Walmart; opens a filled Walmart cart.' },
  instacart: { id: 'instacart', name: 'Instacart', prices: false, checkout: 'shopping-list', note: 'Sends your list to Instacart to shop at stores like Publix.' },
};

export const GROCERY_STRATEGIES = ['cheapest', 'balanced', 'fewest-stores'] as const;
export type GroceryStrategy = (typeof GROCERY_STRATEGIES)[number];

export const GROCERY_STRATEGY_LABELS: Record<GroceryStrategy, string> = {
  cheapest: 'Lowest price',
  balanced: 'Balanced',
  'fewest-stores': 'Fewest stores',
};

export interface GroceryConfig {
  /** For local prices and store lookup */
  zipCode: string | null;
  stores: GroceryStoreId[];
  strategy: GroceryStrategy;
  /** Most stores to split a shop across */
  maxStores: 1 | 2 | 3;
  preferOrganic: boolean;
  preferStoreBrand: boolean;
  /** Store Instacart should shop at */
  instacartRetailer: string;
}

export const DEFAULT_GROCERY_CONFIG: GroceryConfig = {
  zipCode: null,
  stores: ['kroger', 'walmart', 'instacart'],
  strategy: 'balanced',
  maxStores: 2,
  preferOrganic: false,
  preferStoreBrand: false,
  instacartRetailer: 'Publix',
};

/** Typed view of profiles.grocery_config; anything missing or malformed takes the default. */
export function readGroceryConfig(owner: { groceryConfig?: unknown } | null | undefined): GroceryConfig {
  const raw = (owner?.groceryConfig && typeof owner.groceryConfig === 'object' ? owner.groceryConfig : {}) as Record<string, unknown>;
  const d = DEFAULT_GROCERY_CONFIG;
  const zip = typeof raw.zipCode === 'string' && /^\d{5}$/.test(raw.zipCode) ? raw.zipCode : d.zipCode;
  const stores = Array.isArray(raw.stores) ? GROCERY_STORES.filter((s) => (raw.stores as unknown[]).includes(s)) : d.stores;
  return {
    zipCode: zip,
    stores,
    strategy: GROCERY_STRATEGIES.includes(raw.strategy as GroceryStrategy) ? (raw.strategy as GroceryStrategy) : d.strategy,
    maxStores: raw.maxStores === 1 || raw.maxStores === 2 || raw.maxStores === 3 ? raw.maxStores : d.maxStores,
    preferOrganic: typeof raw.preferOrganic === 'boolean' ? raw.preferOrganic : d.preferOrganic,
    preferStoreBrand: typeof raw.preferStoreBrand === 'boolean' ? raw.preferStoreBrand : d.preferStoreBrand,
    instacartRetailer: typeof raw.instacartRetailer === 'string' && raw.instacartRetailer.trim() ? raw.instacartRetailer.trim() : d.instacartRetailer,
  };
}

/** A product a store sells for one shopping-list item. */
export interface ProductOffer {
  store: GroceryStoreId;
  productId: string;
  name: string;
  brand: string | null;
  /** e.g. "16 oz" */
  size: string | null;
  /** Regular price, USD */
  price: number;
  /** Sale/promo price when on deal */
  promoPrice: number | null;
  imageUrl: string | null;
  url: string | null;
  inStock: boolean;
  organic: boolean;
  storeBrand: boolean;
}

export const offerPrice = (o: Pick<ProductOffer, 'price' | 'promoPrice'>) => (o.promoPrice != null && o.promoPrice < o.price ? o.promoPrice : o.price);

/**
 * A "was" price more than this many times the price paid isn't a real deal:
 * stores' list prices (e.g. Walmart's msrp) are sometimes wildly off.
 */
export const MAX_DEAL_RATIO = 2;

/** What a deal saves on this offer; 0 when there's no believable regular price. */
export function dealSaving(o: Pick<ProductOffer, 'price' | 'promoPrice'>): number {
  if (o.promoPrice == null || o.promoPrice <= 0 || o.promoPrice >= o.price) return 0;
  if (o.price > o.promoPrice * MAX_DEAL_RATIO) return 0;
  return Math.round((o.price - o.promoPrice) * 100) / 100;
}

/** Which stores the server has credentials for (from GET /api/grocery/status). */
export type GroceryProviderStatus = Record<GroceryStoreId, boolean>;
