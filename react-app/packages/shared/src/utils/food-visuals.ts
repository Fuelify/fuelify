// Deterministic food visuals (line icon + two-colour tint) derived from a dish
// title, so recipes and meals get consistent artwork without stock images.

/** Line icons a dish can be drawn with when it has no photo. */
export type FoodIcon = 'fish' | 'drumstick' | 'leaf' | 'egg' | 'soup' | 'wheat' | 'apple' | 'utensils';

const FOOD_ICONS: [RegExp, FoodIcon][] = [
  [/salmon|tuna|fish|poke|cod|shrimp|scampi|prawn/i, 'fish'],
  [/chicken|turkey|beef|steak|burger|pork|carnitas|meatball|sausage/i, 'drumstick'],
  [/\beggs?\b|scramble|omelet|shakshuka|frittata/i, 'egg'],
  [/soup|stew|chili|curry|dal|masala|minestrone/i, 'soup'],
  [/fruit|berry|berries|apple|banana|mango|parfait|smoothie|chia/i, 'apple'],
  [/pasta|bolognese|spaghetti|noodle|pad thai|ramen|rice|\boats?\b|porridge|toast|bread|bagel|flatbread|pancake|shells|risotto|orzo|quesadilla|taco|burrito|wrap|sandwich/i, 'wheat'],
  [/salad|quinoa|bowl|veg|zoodle|zucchini|portobello|mushroom|tofu|chickpea|lentil|bean|hummus|edamame|guacamole|pepper/i, 'leaf'],
];

export const DEFAULT_FOOD_ICON: FoodIcon = 'utensils';

// Brand-adjacent pairs (cyan / periwinkle / orchid family plus two warm
// complements) so generated food art sits comfortably next to the logo.
const GRADIENTS: [string, string][] = [
  ['#6DE6FB', '#3FA9E8'],
  ['#759EF8', '#5B6BE8'],
  ['#EBA3F9', '#B76BE6'],
  ['#8EE6C8', '#3FB8A5'],
  ['#FFB49A', '#F27A8C'],
  ['#FFD58A', '#F59E6B'],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A line icon for a dish, from its title. */
export function foodIcon(title: string): FoodIcon {
  return FOOD_ICONS.find(([re]) => re.test(title))?.[1] ?? DEFAULT_FOOD_ICON;
}

/** Two colours for a diagonal gradient; stable for a given title. */
export function foodGradientColors(title: string): [string, string] {
  return GRADIENTS[hash(title) % GRADIENTS.length];
}

/** Initials for an avatar, e.g. ("Ethan", "Minier") → "EM". Empty string when unknown. */
export function initialsOf(first?: string | null, last?: string | null): string {
  return `${first?.trim()[0] ?? ''}${last?.trim()[0] ?? ''}`.toUpperCase();
}
