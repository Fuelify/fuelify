// Ingredient swaps: "ground beef" → ground turkey, Beyond Beef crumbles, …
//
// A swap is saved on a planned meal (meals.ingredient_swaps) and applied when
// the meal's recipe is shown and when the shopping list is built, so the plan,
// list and cart agree. Suggestions respect the user's diet and allergens.

import { parseIngredient } from './ingredients';
import { dietAllows, recipeContainsAllergen } from './plan-generator';

/** Saved on a meal: replace this ingredient line with that one. */
export interface IngredientSwap {
  /** The recipe's ingredient line, as written */
  original: string;
  /** What to use instead, e.g. "1 pound ground turkey" */
  replacement: string;
}

export interface SwapSuggestion {
  /** Name to buy, e.g. "ground turkey" */
  name: string;
  /** Short why, e.g. "Leaner" or "Plant-based" */
  note: string;
  /** Diet the swap fits (for filtering), as recipes are tagged */
  diet: 'Omnivore' | 'Pescatarian' | 'Vegetarian' | 'Vegan';
}

const ANIMAL_ALLERGENS = new Set(['Dairy (Lactose)', 'Eggs', 'Fish', 'Crustaceans']);

const S = (name: string, note: string, diet: SwapSuggestion['diet']): SwapSuggestion => ({ name, note, diet });

/** Ingredient patterns → common swaps. First match wins; order specific before general. */
const SWAP_RULES: [RegExp, SwapSuggestion[]][] = [
  [/\bground (beef|chuck|sirloin)\b|\bhamburger\b/, [S('ground turkey', 'Leaner', 'Omnivore'), S('ground chicken', 'Leaner', 'Omnivore'), S('Beyond Beef crumbles', 'Plant-based', 'Vegan'), S('Impossible ground beef', 'Plant-based', 'Vegan'), S('cooked lentils', 'Plant-based, budget', 'Vegan')]],
  [/\bground (turkey|chicken)\b/, [S('ground beef', 'Richer', 'Omnivore'), S('Beyond Beef crumbles', 'Plant-based', 'Vegan'), S('cooked lentils', 'Plant-based', 'Vegan')]],
  [/\bground pork\b|\bsausage\b/, [S('turkey sausage', 'Leaner', 'Omnivore'), S('chicken sausage', 'Leaner', 'Omnivore'), S('plant-based sausage', 'Plant-based', 'Vegan')]],
  [/\bchicken (breast|thigh|tender)/, [S('chicken thighs', 'Juicier', 'Omnivore'), S('turkey breast', 'Lean', 'Omnivore'), S('extra-firm tofu', 'Plant-based', 'Vegan'), S('chickpeas', 'Plant-based', 'Vegan')]],
  [/\bchicken\b/, [S('turkey', 'Similar', 'Omnivore'), S('extra-firm tofu', 'Plant-based', 'Vegan'), S('chickpeas', 'Plant-based', 'Vegan')]],
  [/\b(steak|beef)\b/, [S('chicken breast', 'Leaner', 'Omnivore'), S('portobello mushrooms', 'Vegetarian', 'Vegan'), S('seitan', 'Plant-based', 'Vegan')]],
  [/\bbacon\b/, [S('turkey bacon', 'Leaner', 'Omnivore'), S('tempeh bacon', 'Plant-based', 'Vegan')]],
  [/\bshrimp|prawn/, [S('chicken breast', 'No shellfish', 'Omnivore'), S('scallops', 'Seafood', 'Pescatarian'), S('extra-firm tofu', 'Plant-based', 'Vegan')]],
  [/\bsalmon\b/, [S('steelhead trout', 'Similar', 'Pescatarian'), S('cod', 'Milder', 'Pescatarian'), S('chicken breast', 'No fish', 'Omnivore')]],
  [/\b(cod|tilapia|halibut|white fish)\b/, [S('tilapia', 'Budget', 'Pescatarian'), S('salmon', 'Richer', 'Pescatarian'), S('extra-firm tofu', 'Plant-based', 'Vegan')]],
  [/\b(cheddar|colby|cojack|co-jack)\b/, [S('pepper jack cheese', 'Spicier', 'Vegetarian'), S('Monterey Jack cheese', 'Milder', 'Vegetarian'), S('Colby Jack cheese', 'Melty', 'Vegetarian'), S('mozzarella cheese', 'Milder', 'Vegetarian'), S('dairy-free cheddar shreds', 'Dairy-free', 'Vegan')]],
  [/\b(processed cheese|velveeta|american cheese)\b/, [S('sharp cheddar cheese', 'Real cheese', 'Vegetarian'), S('pepper jack cheese', 'Spicier', 'Vegetarian'), S('dairy-free cheese sauce', 'Dairy-free', 'Vegan')]],
  [/\b(mozzarella|monterey jack|pepper jack|swiss|provolone)\b/, [S('cheddar cheese', 'Sharper', 'Vegetarian'), S('provolone cheese', 'Mild', 'Vegetarian'), S('dairy-free mozzarella shreds', 'Dairy-free', 'Vegan')]],
  [/\b(parmesan|pecorino)\b/, [S('pecorino romano', 'Saltier', 'Vegetarian'), S('nutritional yeast', 'Dairy-free', 'Vegan')]],
  [/\b(feta|goat cheese)\b/, [S('goat cheese', 'Creamier', 'Vegetarian'), S('dairy-free feta', 'Dairy-free', 'Vegan')]],
  [/\bsour cream\b/, [S('plain Greek yogurt', 'More protein', 'Vegetarian'), S('dairy-free sour cream', 'Dairy-free', 'Vegan')]],
  [/\b(heavy cream|whipping cream)\b/, [S('half-and-half', 'Lighter', 'Vegetarian'), S('coconut cream', 'Dairy-free', 'Vegan')]],
  [/\bcream of (mushroom|chicken|celery) soup\b/, [S('cream of mushroom soup (low sodium)', 'Less salt', 'Vegetarian'), S('dairy-free cream of mushroom soup', 'Dairy-free', 'Vegan')]],
  [/\b(whole |2% |skim )?milk\b/, [S('oat milk', 'Dairy-free', 'Vegan'), S('almond milk', 'Dairy-free', 'Vegan'), S('2% milk', 'Lighter', 'Vegetarian')]],
  [/\b(almond|cashew|sunflower seed|sunflower) butter\b/, [S('peanut butter', 'Budget', 'Vegan'), S('sunflower seed butter', 'Nut-free', 'Vegan')]],
  [/\bpeanut butter\b/, [S('almond butter', 'Peanut-free', 'Vegan'), S('sunflower seed butter', 'Nut-free', 'Vegan')]],
  [/\bbutter\b/, [S('olive oil', 'Dairy-free', 'Vegan'), S('vegan butter', 'Dairy-free', 'Vegan')]],
  [/\byogurt\b/, [S('skyr', 'More protein', 'Vegetarian'), S('coconut yogurt', 'Dairy-free', 'Vegan')]],
  [/\beggs?\b/, [S('JUST Egg', 'Plant-based', 'Vegan'), S('egg whites', 'Lighter', 'Vegetarian')]],
  [/\b(spaghetti|penne|pasta|macaroni|rotini|linguine|fettuccine|shells|orzo)\b/, [S('whole wheat pasta', 'More fiber', 'Vegan'), S('chickpea pasta', 'Gluten-free, more protein', 'Vegan'), S('gluten-free pasta', 'Gluten-free', 'Vegan'), S('zucchini noodles', 'Low carb', 'Vegan')]],
  [/\bnoodles?\b/, [S('rice noodles', 'Gluten-free', 'Vegan'), S('zucchini noodles', 'Low carb', 'Vegan')]],
  [/\b(white |jasmine |basmati )?rice\b/, [S('brown rice', 'More fiber', 'Vegan'), S('cauliflower rice', 'Low carb', 'Vegan'), S('quinoa', 'More protein', 'Vegan')]],
  [/\b(flour )?tortillas?\b/, [S('whole wheat tortillas', 'More fiber', 'Vegan'), S('corn tortillas', 'Gluten-free', 'Vegan'), S('lettuce wraps', 'Low carb', 'Vegan')]],
  [/\b(bread|buns?|rolls?)\b/, [S('whole grain bread', 'More fiber', 'Vegan'), S('gluten-free bread', 'Gluten-free', 'Vegan')]],
  [/\bsoy sauce\b/, [S('tamari', 'Gluten-free', 'Vegan'), S('coconut aminos', 'Soy-free', 'Vegan')]],
  [/\b(sugar|brown sugar)\b/, [S('honey', 'Natural', 'Vegetarian'), S('maple syrup', 'Natural', 'Vegan')]],
  [/\b(vegetable|canola) oil\b/, [S('avocado oil', 'High heat', 'Vegan'), S('olive oil', 'Flavorful', 'Vegan')]],
  [/\bchicken (broth|stock)\b/, [S('vegetable broth', 'Vegetarian', 'Vegan'), S('low-sodium chicken broth', 'Less salt', 'Omnivore')]],
  [/\bbeef (broth|stock)\b/, [S('mushroom broth', 'Vegetarian', 'Vegan'), S('low-sodium beef broth', 'Less salt', 'Omnivore')]],
  [/\btaco seasoning\b/, [S('low-sodium taco seasoning', 'Less salt', 'Vegan')]],
  [/\bspinach\b/, [S('kale', 'Heartier', 'Vegan'), S('arugula', 'Peppery', 'Vegan')]],
];

/**
 * Swap ideas for one ingredient, filtered to the user's diet and allergens
 * (a vegan sees only plant-based swaps; a dairy-free user sees no cheese).
 */
export function suggestSwaps(ingredient: string, { diet, allergens = [] }: { diet?: string | null; allergens?: string[] } = {}): SwapSuggestion[] {
  const name = parseIngredient(ingredient).name;
  const rule = SWAP_RULES.find(([re]) => re.test(name));
  if (!rule) return [];
  return rule[1].filter((s) => {
    // A vegan product ("dairy-free cheddar shreds") can't contain animal allergens, whatever its name says
    const relevant = s.diet === 'Vegan' ? allergens.filter((a) => !ANIMAL_ALLERGENS.has(a)) : allergens;
    return s.name !== name && dietAllows(diet, s.diet) && !recipeContainsAllergen({ ingredients: [s.name] }, relevant);
  });
}

/** The original line with its ingredient replaced, keeping quantity and unit ("1 pound ground beef" → "1 pound ground turkey"). */
export function swapLine(original: string, replacementName: string): string {
  const line = original.trim();
  const p = parseIngredient(line);
  if (p.quantity == null) return replacementName;
  // Leading amount as written ("1 1/2", "½", "2-3", "1 (10 ounce)"), then the unit word if any
  const NUM = String.raw`(?:\d+(?:[./]\d+)?|[½⅓⅔¼¾⅛])`;
  const m = line.match(new RegExp(`^(${NUM}(?:\\s*(?:-|–|to|\\s)\\s*${NUM})*\\s*(?:\\([^)]*\\)\\s*)?)`));
  const amount = m ? m[1].trim() : '';
  const unitWord = p.unit ? line.slice(m ? m[1].length : 0).trim().split(/\s+/)[0] : '';
  return [amount, unitWord, replacementName].filter(Boolean).join(' ');
}

/** A recipe's ingredients with a meal's swaps applied (unknown originals are ignored). */
export function applySwaps(ingredients: string[], swaps: IngredientSwap[]): string[] {
  if (!swaps.length) return ingredients;
  return ingredients.map((line) => swaps.find((s) => s.original === line)?.replacement ?? line);
}

/** Lenient read of meals.ingredient_swaps. */
export function readSwaps(raw: unknown): IngredientSwap[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is IngredientSwap => typeof s?.original === 'string' && typeof s?.replacement === 'string');
}

/** Add or replace the swap for `original`; swapping back to the original removes it. */
export function withSwap(swaps: IngredientSwap[], original: string, replacement: string | null): IngredientSwap[] {
  const rest = swaps.filter((s) => s.original !== original);
  return replacement && replacement.trim() && replacement.trim() !== original ? [...rest, { original, replacement: replacement.trim() }] : rest;
}
