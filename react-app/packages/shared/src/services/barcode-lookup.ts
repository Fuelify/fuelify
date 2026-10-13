// Barcode lookup via Open Food Facts (free, no API key).
// https://world.openfoodfacts.org/api/v2/product/{barcode}.json

import type { ProductInfo } from '../models/external-data';
import type { PantryCategory } from '../models/pantry';

/**
 * Maps Open Food Facts `categories_tags` entries to our PANTRY_CATEGORIES.
 * First matching tag (in OFF's order) wins.
 */
const OFF_CATEGORY_MAP: Array<[RegExp, PantryCategory]> = [
  [/^en:(dairies|milks|yogurts|cheeses|butters|creams)$/, 'Dairy'],
  [/^en:eggs$/, 'Eggs'],
  [/^en:(meats|poultries|cooked-meats|charcuteries|sausages)$/, 'Meat & Seafood'],
  [/^en:(seafood|fishes|shellfishes)$/, 'Meat & Seafood'],
  [/^en:(fruits|vegetables|fresh-foods|fresh-vegetables|fresh-fruits)$/, 'Produce'],
  [/^en:(breads|baguettes|buns|viennoiseries|pastries|bread-bakery)$/, 'Bread & Bakery'],
  [/^en:delicatessen$/, 'Deli'],
  [/^en:(beverages|waters|sodas|juices|teas|coffees|alcoholic-beverages)$/, 'Beverages'],
  [/^en:(snacks|salty-snacks|chips-and-fries|crackers|sweet-snacks|biscuits|cookies|confectioneries|chocolates|candies)$/, 'Snacks'],
  [/^en:(cereals-and-potatoes|cereals|pastas|rices|noodles|grains)$/, 'Grains & Pasta'],
  [/^en:(canned-foods|canned-vegetables|canned-fruits|preserved-foods)$/, 'Canned & Jarred'],
  [/^en:(condiments|sauces|spreads|dressings|mayonnaises|ketchups|mustards)$/, 'Condiments & Sauces'],
  [/^en:(spices|herbs|seasonings|salts)$/, 'Spices & Seasonings'],
  [/^en:(baking-ingredients|flours|sugars|yeasts|baking-powders)$/, 'Baking'],
  [/^en:(frozen-vegetables)$/, 'Frozen Vegetables'],
  [/^en:(frozen-fruits)$/, 'Frozen Fruit'],
  [/^en:(frozen-foods|frozen-meals|ready-meals|frozen-pizzas)$/, 'Frozen Meals'],
];

function mapCategory(tags: string[] | undefined): PantryCategory | undefined {
  if (!tags) return undefined;
  for (const tag of tags) {
    for (const [pattern, cat] of OFF_CATEGORY_MAP) {
      if (pattern.test(tag)) return cat;
    }
  }
  return undefined;
}

/** Parse a quantity string like "500 g", "1.5 L", "12 x 330 ml" → { quantity, unit } */
export function parsePackageSize(s: string | null | undefined): { quantity?: number; unit?: string } {
  if (!s) return {};
  // Try "N x M unit" → treat as N count
  const multi = s.match(/^\s*(\d+(?:\.\d+)?)\s*[x×]\s*\d/i);
  if (multi) return { quantity: parseFloat(multi[1]), unit: 'pack' };
  const match = s.match(/^\s*(\d+(?:\.\d+)?)\s*([a-zA-Zµμ]+)/);
  if (!match) return {};
  return { quantity: parseFloat(match[1]), unit: match[2].toLowerCase() };
}

interface OFFProduct {
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  categories_tags?: string[];
  image_front_small_url?: string;
  image_small_url?: string;
  image_url?: string;
  quantity?: string;
  product_quantity?: string | number;
  product_quantity_unit?: string;
}

interface OFFResponse {
  status: 0 | 1;
  code?: string;
  product?: OFFProduct;
}

export interface BarcodeLookupOptions {
  signal?: AbortSignal;
  /** Override the API base URL (useful for tests). */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://world.openfoodfacts.org';

/**
 * Look up a barcode via Open Food Facts.
 * Returns `null` when the product is not found (OFF returns status=0).
 * Throws on network/HTTP errors.
 */
export async function lookupBarcode(
  barcode: string,
  options: BarcodeLookupOptions = {},
): Promise<ProductInfo | null> {
  const trimmed = barcode.trim();
  if (!trimmed) throw new Error('Barcode is empty');

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${baseUrl}/api/v2/product/${encodeURIComponent(trimmed)}.json`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
  } catch (e) {
    throw new Error(`Barcode lookup network error: ${(e as Error).message}`);
  }

  // Open Food Facts answers 404 for products it doesn't have: that's "not found", not an error
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Barcode lookup failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as OFFResponse;
  if (json.status === 0 || !json.product) return null;

  const p = json.product;
  const name =
    (p.product_name_en && p.product_name_en.trim()) ||
    (p.product_name && p.product_name.trim()) ||
    (p.generic_name && p.generic_name.trim()) ||
    '';
  if (!name) return null;

  const brand = p.brands ? p.brands.split(',')[0].trim() : undefined;
  const imageUrl = p.image_front_small_url || p.image_small_url || p.image_url;
  const category = mapCategory(p.categories_tags);
  const { quantity, unit } = parsePackageSize(p.quantity);

  return {
    barcode: trimmed,
    name,
    brand: brand || undefined,
    category,
    imageUrl,
    quantity,
    unit,
  };
}

/** Where a barcode's details came from */
export type ProductSource = 'saved' | 'openfoodfacts' | 'walmart' | 'kroger';

/** Priority per field: product databases name things well, stores have the photos and sizes. */
const FIELD_PRIORITY: Record<'name' | 'brand' | 'category' | 'size' | 'image', ProductSource[]> = {
  // What someone in Fuelify confirmed beats everything
  name: ['saved', 'openfoodfacts', 'walmart', 'kroger'],
  brand: ['saved', 'openfoodfacts', 'walmart', 'kroger'],
  category: ['saved', 'openfoodfacts', 'walmart', 'kroger'],
  size: ['saved', 'openfoodfacts', 'walmart', 'kroger'],
  // Store photos are consistent product shots; Open Food Facts' are user photos, often missing
  image: ['walmart', 'kroger', 'openfoodfacts', 'saved'],
};

/**
 * Combine what each source knows about one barcode, field by field, so a
 * gap in one (no photo, no brand, no size) is filled from another.
 */
export function mergeProductInfo(barcode: string, found: Partial<Record<ProductSource, Partial<ProductInfo> | null>>): { product: ProductInfo; sources: ProductSource[] } | null {
  const pick = <K extends keyof ProductInfo>(field: keyof typeof FIELD_PRIORITY, key: K): ProductInfo[K] | undefined => {
    for (const s of FIELD_PRIORITY[field]) {
      const v = found[s]?.[key];
      if (v !== undefined && v !== null && v !== '') return v as ProductInfo[K];
    }
    return undefined;
  };
  const name = pick('name', 'name');
  if (!name) return null;
  const sizeFrom = FIELD_PRIORITY.size.find((s) => found[s]?.quantity != null);
  const product: ProductInfo = {
    barcode,
    name,
    brand: pick('brand', 'brand'),
    category: pick('category', 'category'),
    imageUrl: pick('image', 'imageUrl'),
    quantity: sizeFrom ? found[sizeFrom]!.quantity : undefined,
    unit: sizeFrom ? found[sizeFrom]!.unit : undefined,
  };
  const sources = (Object.keys(found) as ProductSource[]).filter((s) => found[s]);
  return { product, sources };
}
