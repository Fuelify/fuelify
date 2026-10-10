// Deterministic food visuals (emoji + two-colour gradient) derived from a dish
// title, so recipes and meals get consistent artwork without stock images.

const FOOD_EMOJI: [RegExp, string][] = [
  [/salmon|tuna|fish|poke/i, '🐟'],
  [/shrimp|scampi|prawn/i, '🍤'],
  [/chicken|turkey/i, '🍗'],
  [/beef|steak|burger/i, '🥩'],
  [/taco|burrito|wrap/i, '🌮'],
  [/curry|dal|masala/i, '🍛'],
  [/pad thai|noodle|ramen|zoodle/i, '🍜'],
  [/pasta|bolognese|spaghetti/i, '🍝'],
  [/salad|quinoa|bowl/i, '🥗'],
  [/oat|porridge|cereal/i, '🥣'],
  [/egg|scramble|omelet/i, '🍳'],
  [/pizza/i, '🍕'],
  [/soup|stew/i, '🍲'],
  [/mushroom|portobello/i, '🍄'],
  [/rice/i, '🍚'],
  [/sandwich|toast|bread/i, '🥪'],
  [/fruit|berry|apple|banana/i, '🍓'],
];

export const DEFAULT_FOOD_EMOJI = '🍽️';

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

export function foodEmoji(title: string): string {
  return FOOD_EMOJI.find(([re]) => re.test(title))?.[1] ?? DEFAULT_FOOD_EMOJI;
}

/** Two colours for a diagonal gradient; stable for a given title. */
export function foodGradientColors(title: string): [string, string] {
  return GRADIENTS[hash(title) % GRADIENTS.length];
}

/** Initials for an avatar, e.g. ("Ethan", "Minier") → "EM". Empty string when unknown. */
export function initialsOf(first?: string | null, last?: string | null): string {
  return `${first?.trim()[0] ?? ''}${last?.trim()[0] ?? ''}`.toUpperCase();
}
