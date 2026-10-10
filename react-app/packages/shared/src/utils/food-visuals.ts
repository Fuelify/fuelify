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

const GRADIENTS: [string, string][] = [
  ['#ff9a5a', '#ff6b6b'],
  ['#4db6ac', '#2e7d74'],
  ['#ffbd73', '#e8873a'],
  ['#7c83fd', '#4b52c7'],
  ['#9bd16b', '#4f9a3a'],
  ['#f78fb3', '#c44569'],
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
