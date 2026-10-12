// Ingredient lines → a household shopping list.
//
// "1 (10.5 ounce) can condensed cream of mushroom soup" and "2 cups chopped
// onion, divided" become structured items, the same item across recipes is
// combined, and what's already in the pantry is left off.

import type { CartCategory } from '../models/household';

export interface ParsedIngredient {
  /** As written */
  original: string;
  quantity: number | null;
  unit: string | null;
  /** What to buy, e.g. "cream of mushroom soup" */
  name: string;
  /** Normalized key for combining across recipes, e.g. "onion" */
  key: string;
}

export interface ShoppingNeed {
  key: string;
  name: string;
  /** Combined amounts, e.g. ["2 cup", "1 whole"] (one per unit) */
  amounts: { quantity: number | null; unit: string | null }[];
  category: CartCategory;
  /** Recipe titles that use it */
  recipes: string[];
}

const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875, '⅕': 0.2 };

// Canonical unit ← spellings
const UNITS: [string, RegExp][] = [
  ['cup', /^(cups?|c\.?)$/i],
  ['tbsp', /^(tablespoons?|tbsps?\.?|tbs\.?|T)$/],
  ['tsp', /^(teaspoons?|tsps?\.?|t)$/],
  ['oz', /^(ounces?|oz\.?)$/i],
  ['fl oz', /^(fl\.? ?oz\.?|fluid ounces?)$/i],
  ['lb', /^(pounds?|lbs?\.?)$/i],
  ['g', /^(grams?|g)$/i],
  ['kg', /^(kilograms?|kgs?)$/i],
  ['ml', /^(millilit(er|re)s?|ml)$/i],
  ['l', /^(lit(er|re)s?|l)$/i],
  ['gallon', /^(gallons?|gal\.?)$/i],
  ['quart', /^(quarts?|qts?\.?)$/i],
  ['pint', /^(pints?|pts?\.?)$/i],
  ['loaf', /^(loaf|loaves)$/i],
  ['carton', /^cartons?$/i],
  ['can', /^cans?$/i],
  ['package', /^(packages?|pkgs?\.?|packets?|envelopes?)$/i],
  ['jar', /^jars?$/i],
  ['bottle', /^bottles?$/i],
  ['bag', /^bags?$/i],
  ['box', /^box(es)?$/i],
  ['clove', /^cloves?$/i],
  ['slice', /^slices?$/i],
  ['head', /^heads?$/i],
  ['bunch', /^bunch(es)?$/i],
  ['stalk', /^stalks?$/i],
  ['stick', /^sticks?$/i],
  ['sprig', /^sprigs?$/i],
  ['pinch', /^pinch(es)?$/i],
  ['dash', /^dash(es)?$/i],
  ['handful', /^handfuls?$/i],
  ['fillet', /^fill?ets?$/i],
  ['breast', /^breasts?$/i],
  ['thigh', /^thighs?$/i],
];

const PREP_WORDS = /\b(chopped|diced|minced|sliced|grated|shredded|crumbled|cubed|peeled|seeded|halved|quartered|trimmed|rinsed|drained|softened|melted|beaten|divided|finely|roughly|coarsely|thinly|freshly|fresh|large|medium|small|optional|to taste|packed|heaping|level|warm|cold|room temperature|cooked|uncooked|frozen and thawed)\b/gi;

/** Never worth putting on a list */
const STAPLES = /^(water|ice|salt|pepper|black pepper|salt and pepper|kosher salt|sea salt|ice cubes?|cooking spray)$/i;

function parseQuantity(s: string): { value: number; rest: string } | null {
  // "1 1/2", "1/2", "1½", "½", "1.5", "2", then an optional range "-3" / "to 3" (takes the larger)
  const m = s.match(/^(?:(\d+)\s+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d+(?:\.\d+)?)?\s*([½⅓⅔¼¾⅛⅜⅝⅞⅕])?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*/);
  if (!m || !m[0].trim()) return null;
  let value: number;
  if (m[1]) value = Number(m[1]) + Number(m[2]) / Number(m[3]);
  else if (m[4]) value = Number(m[4]) / Number(m[5]);
  else value = Number(m[6] ?? 0) + (m[7] ? UNICODE_FRACTIONS[m[7]] : 0);
  if (m[8]) value = Math.max(value, Number(m[8]));
  return value > 0 ? { value: Math.round(value * 1000) / 1000, rest: s.slice(m[0].length) } : null;
}

function singular(word: string): string {
  if (/(ss|us|is)$/i.test(word)) return word;
  if (/ies$/i.test(word)) return word.replace(/ies$/i, 'y');
  if (/(tomato|potato)es$/i.test(word)) return word.replace(/es$/i, '');
  if (/(ch|sh|x)es$/i.test(word)) return word.replace(/es$/i, '');
  if (/leaves$/i.test(word)) return word.replace(/leaves$/i, 'leaf');
  if (/s$/i.test(word) && word.length > 3) return word.replace(/s$/i, '');
  return word;
}

/** Key for combining the same ingredient across recipes. */
export function ingredientKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .join(' ')
    .trim();
}

export function parseIngredient(line: string): ParsedIngredient {
  let s = line.trim().replace(/^[-*•▢]\s*/, '');
  const q = parseQuantity(s);
  let quantity: number | null = null;
  if (q) {
    quantity = q.value;
    s = q.rest;
  }
  // Package size in parentheses, e.g. "1 (10.5 ounce) can soup" — drop it; the can is the unit
  s = s.replace(/^\([^)]*\)\s*/, '');
  let unit: string | null = null;
  const first = s.match(/^([a-zA-Z.]+(?:\s+oz\.?)?)\s+/);
  if (first) {
    const hit = UNITS.find(([, re]) => re.test(first[1]));
    if (hit) {
      unit = hit[0];
      s = s.slice(first[0].length);
    }
  }
  const name = s
    .replace(/^of\s+/i, '')
    .replace(/\([^)]*\)/g, ' ') // "(such as RO*TEL®)"
    .split(/,|;| - | – /)[0] // ", diced"
    .replace(/\bor\b.*$/i, '') // "spaghetti or other pasta" → "spaghetti"
    .replace(/\bfor (serving|garnish).*$/i, '')
    .replace(PREP_WORDS, ' ')
    .replace(/[®™*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return { original: line.trim(), quantity, unit, name: name || line.trim().toLowerCase(), key: ingredientKey(name || line) };
}

const CATEGORY_RULES: [CartCategory, RegExp][] = [
  ['Meat & Seafood', /\b(chicken|beef|pork|turkey|bacon|ham|sausage|lamb|steak|salmon|tuna|cod|shrimp|fish|prawn|scallop|crab|tilapia|halibut)\b/],
  ['Dairy', /\b(milk|cheese|cheddar|parmesan|mozzarella|feta|ricotta|yogurt|butter|cream|egg|sour cream|half and half)\b/],
  ['Spices & Seasonings', /\b(cumin|paprika|oregano|basil leaf|thyme|rosemary|cinnamon|nutmeg|chili powder|garlic powder|onion powder|seasoning|spice|curry powder|turmeric|cayenne|bay leaf|red pepper flake)\b/],
  ['Condiments & Sauces', /\b(sauce|ketchup|mustard|mayo|mayonnaise|vinegar|oil|dressing|salsa|soy|honey|syrup|tahini|pesto|hummus)\b/],
  ['Canned & Jarred', /\b(canned|can|soup|broth|stock|bean|chickpea|tomato paste|diced tomato|crushed tomato|coconut milk)\b/],
  ['Grains & Pasta', /\b(pasta|spaghetti|penne|noodle|rice|quinoa|oat|flour|orzo|couscous|tortilla|shell|macaroni|lentil)\b/],
  ['Bakery', /\b(bread|bun|roll|bagel|pita|naan|flatbread|baguette)\b/],
  ['Frozen', /\b(frozen|ice cream)\b/],
  ['Beverages', /\b(juice|coffee|tea|soda|wine|beer)\b/],
  ['Snacks', /\b(chip|cracker|nut|almond|cashew|peanut|pretzel|popcorn)\b/],
  ['Produce', /\b(onion|garlic|tomato|potato|carrot|celery|pepper|lettuce|spinach|kale|cucumber|zucchini|avocado|lemon|lime|apple|banana|berry|mango|cilantro|parsley|basil|ginger|mushroom|broccoli|cabbage|squash|corn|scallion|green onion|herb|fruit|vegetable|bok choy|jalapeno)\b/],
];

export function categorizeIngredient(key: string): CartCategory {
  return CATEGORY_RULES.find(([, re]) => re.test(key))?.[0] ?? 'Other';
}

/** True when a pantry item covers this ingredient (by name, either way round). */
export function pantryCovers(pantryNames: string[], key: string): boolean {
  return pantryNames.some((p) => {
    const pk = ingredientKey(p);
    return pk.length >= 3 && (pk === key || key.endsWith(` ${pk}`) || key === `${pk}s` || pk.endsWith(` ${key}`));
  });
}

/** Where a list item comes from: one ingredient line of one planned meal. */
export interface ListSource {
  mealId: string;
  /** The recipe's line as written (what a swap replaces) */
  original: string;
  /** The line after any swap */
  line: string;
}

export interface ListItem extends ShoppingNeed {
  /** The pantry already has it (the cart leaves it out) */
  inPantry: boolean;
  sources: ListSource[];
}

/**
 * The week's shopping list: every ingredient of the planned meals, the same
 * item combined across meals (summed per unit), staples dropped, and items the
 * pantry covers flagged rather than removed.
 */
export function buildPlanList(
  meals: { mealId: string; title: string; lines: { original: string; line: string }[] }[],
  pantryNames: string[] = [],
): ListItem[] {
  const byKey = new Map<string, ListItem>();
  for (const meal of meals) {
    for (const { original, line } of meal.lines) {
      const p = parseIngredient(line);
      if (!p.key || STAPLES.test(p.name)) continue;
      const item = byKey.get(p.key) ?? {
        key: p.key, name: p.name, amounts: [], category: categorizeIngredient(p.key), recipes: [],
        inPantry: pantryCovers(pantryNames, p.key), sources: [],
      };
      const same = item.amounts.find((a) => a.unit === p.unit);
      if (same && same.quantity != null && p.quantity != null) same.quantity = Math.round((same.quantity + p.quantity) * 1000) / 1000;
      else if (!same) item.amounts.push({ quantity: p.quantity, unit: p.unit });
      if (!item.recipes.includes(meal.title)) item.recipes.push(meal.title);
      item.sources.push({ mealId: meal.mealId, original, line });
      byKey.set(p.key, item);
    }
  }
  return [...byKey.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/**
 * Combine the ingredients of several recipes into one list, leaving out what
 * the pantry covers (returned separately so the app can say so).
 */
export function buildShoppingList(
  recipes: { title: string; ingredients: string[] }[],
  pantryNames: string[] = [],
): { needs: ShoppingNeed[]; inPantry: string[] } {
  const items = buildPlanList(
    recipes.map((r, i) => ({ mealId: String(i), title: r.title, lines: r.ingredients.map((l) => ({ original: l, line: l })) })),
    pantryNames,
  );
  const strip = ({ inPantry: _p, sources: _s, ...need }: ListItem): ShoppingNeed => need;
  return { needs: items.filter((i) => !i.inPantry).map(strip), inPantry: items.filter((i) => i.inPantry).map((i) => i.name) };
}

/** "2 cup + 1" style label for a combined need. */
export function formatAmounts(amounts: ShoppingNeed['amounts']): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
  return amounts
    .filter((a) => a.quantity != null || a.unit)
    .map((a) => [a.quantity != null ? fmt(a.quantity) : null, a.unit].filter(Boolean).join(' '))
    .join(' + ');
}
