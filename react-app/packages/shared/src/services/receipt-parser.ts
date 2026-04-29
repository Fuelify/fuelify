// Receipt OCR via Supabase Edge Function `parse-receipt` (proxies Mindee).

import type { TypedSupabaseClient } from '../supabase/client';
import type {
  ReceiptLineItem,
  ReceiptParseResult,
  PantryItemDraft,
} from '../models/external-data';
import type { PantryCategory, StorageZone } from '../models/pantry';

export class ReceiptParser {
  constructor(private supabase: TypedSupabaseClient) {}

  /**
   * Parse a receipt image.
   * @param imageBase64 Raw base64 (no data URL prefix).
   */
  async parse(imageBase64: string): Promise<ReceiptParseResult> {
    if (!imageBase64) throw new Error('imageBase64 is required');

    const { data, error } = await this.supabase.functions.invoke<ReceiptParseResult>(
      'parse-receipt',
      { body: { imageBase64 } },
    );

    if (error) throw new Error(`Receipt parse failed: ${error.message}`);
    if (!data) throw new Error('Receipt parse returned no data');
    return data;
  }
}

/** Rough keyword → category map. Mirrors the server-side heuristic. */
const KEYWORD_CATEGORIES: Array<[RegExp, PantryCategory, StorageZone?]> = [
  [/\b(milk|cheese|yogurt|butter|cream|dairy)\b/i, 'Dairy', 'cool'],
  [/\beggs?\b/i, 'Eggs', 'cool'],
  [/\b(chicken|beef|pork|turkey|bacon|sausage|ham|steak|ground)\b/i, 'Meat & Seafood', 'cool'],
  [/\b(salmon|tuna|fish|shrimp|cod|tilapia)\b/i, 'Meat & Seafood', 'cool'],
  [/\b(apple|banana|orange|lettuce|spinach|tomato|onion|pepper|carrot|broccoli|potato|produce|kale|cucumber)\b/i, 'Produce', 'cool'],
  [/\b(bread|bagel|roll|bun|baguette|muffin|croissant)\b/i, 'Bread & Bakery', 'dry'],
  [/\b(juice|soda|coffee|tea|water|beer|wine|kombucha)\b/i, 'Beverages'],
  [/\b(chips|crackers|cookies|candy|chocolate|pretzels|popcorn)\b/i, 'Snacks', 'dry'],
  [/\b(pasta|rice|noodle|cereal|oats|quinoa|flour)\b/i, 'Grains & Pasta', 'dry'],
  [/\b(canned|can of|jar of|soup|beans|tomato sauce)\b/i, 'Canned & Jarred', 'dry'],
  [/\b(ketchup|mustard|mayo|mayonnaise|dressing|sauce|syrup|honey|jam)\b/i, 'Condiments & Sauces'],
  [/\b(salt|pepper|spice|seasoning|paprika|cumin|oregano)\b/i, 'Spices & Seasonings', 'dry'],
  [/\b(sugar|baking|yeast|vanilla|cocoa)\b/i, 'Baking', 'dry'],
  [/\b(frozen pizza|frozen meal|tv dinner)\b/i, 'Frozen Meals', 'frozen'],
  [/\bfrozen (vegetable|veggie|peas|corn|spinach)\b/i, 'Frozen Vegetables', 'frozen'],
  [/\bfrozen (fruit|berries|strawberr|blueberr|mango)\b/i, 'Frozen Fruit', 'frozen'],
  [/\bfrozen\b/i, 'Frozen Meals', 'frozen'],
  [/\b(deli|salami|prosciutto|pastrami)\b/i, 'Deli', 'cool'],
];

function guessCategoryAndZone(description: string): { category?: PantryCategory; storageZone?: StorageZone } {
  for (const [pattern, category, zone] of KEYWORD_CATEGORIES) {
    if (pattern.test(description)) return { category, storageZone: zone };
  }
  return {};
}

/** Convert a receipt line item into a pantry item draft. */
export function mapLineItemToPantryDraft(line: ReceiptLineItem): PantryItemDraft {
  const { category, storageZone } = guessCategoryAndZone(line.description);
  return {
    name: line.description.trim(),
    quantity: line.quantity && line.quantity > 0 ? line.quantity : 1,
    category: line.suggestedCategory || category,
    storageZone: storageZone ?? 'dry',
    status: 'sealed',
    remainingPct: 100,
  };
}
