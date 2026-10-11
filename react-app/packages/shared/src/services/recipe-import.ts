// Recipe import: turn a recipe web page (or pasted text) into a recipe draft.
//
// Most recipe sites publish schema.org/Recipe JSON-LD for search engines, so
// that's the primary source. Pasted text uses simple section headings.
// Pure functions only — fetching the page happens server-side (web API route).

import type { MealType } from '../models/meal';

export interface RecipeDraft {
  title: string;
  description: string;
  imageUrl: string | null;
  ingredients: string[];
  steps: string[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  cuisine: string | null;
  /** Omnivore / Pescatarian / Vegetarian / Vegan / Raw, when known */
  dietType: string | null;
  calories: number | null;
  /** Ordered: first is the preferred slot */
  mealTypes: MealType[];
  sourceUrl: string | null;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°' };

/** Strip tags, decode common HTML entities and collapse whitespace. */
export function cleanText(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** ISO 8601 duration (e.g. "PT1H30M") to minutes. */
export function parseIsoDuration(s: unknown): number | null {
  if (typeof s !== 'string') return null;
  const m = s.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!m) return null;
  const minutes = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) + Math.round(Number(m[4] ?? 0) / 60);
  return minutes > 0 ? minutes : null;
}

const firstNumber = (v: unknown): number | null => {
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s === 'number') return Number.isFinite(s) ? Math.round(s) : null;
  const m = typeof s === 'string' ? s.match(/\d+(\.\d+)?/) : null;
  return m ? Math.round(Number(m[0])) : null;
};

const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

const typeIs = (node: Record<string, unknown>, type: string) => asArray(node['@type'] as string | string[]).some((t) => typeof t === 'string' && t.toLowerCase() === type.toLowerCase());

// ---------------------------------------------------------------------------
// Meal type and diet inference
// ---------------------------------------------------------------------------

/** Meal slots from a recipe's category/keywords/title. Defaults to dinner, then lunch. */
export function inferMealTypes(...hints: (string | null | undefined)[]): MealType[] {
  const text = hints.filter(Boolean).join(' ').toLowerCase();
  if (/\b(breakfast|brunch|pancakes?|waffles?|oatmeal|granola|omelett?e|porridge)\b/.test(text)) return ['breakfast', 'lunch'];
  if (/\b(snacks?|appetizers?|starters?|dips?|desserts?|cookies?|bars?|bites?)\b/.test(text)) return ['snack'];
  if (/\b(salads?|sandwich(es)?|wraps?|soups?|lunch)\b/.test(text)) return ['lunch', 'dinner'];
  return ['dinner', 'lunch'];
}

const MEAT = /\b(chicken|beef|pork|bacon|ham|turkey|lamb|sausages?|steak|prosciutto|chorizo|pancetta|veal|duck|venison|meatballs?|ground meat)\b/i;
const SEAFOOD = /\b(fish|salmon|tuna|cod|shrimp|prawns?|crab|lobster|scallops?|anchov(y|ies)|sardines?|tilapia|halibut|mussels|clams|trout)\b/i;

/**
 * Diet from schema.org `suitableForDiet`, keywords, or ingredients. Only
 * claims Omnivore/Pescatarian from ingredients; vegetarian or vegan must be
 * stated by the source, since a missed ingredient there would be a real error.
 */
export function inferDietType(ingredients: string[], declared: string[] = []): string | null {
  const said = declared.join(' ').toLowerCase();
  const text = ingredients.join('\n');
  if (MEAT.test(text)) return 'Omnivore';
  if (SEAFOOD.test(text)) return 'Pescatarian';
  if (/vegan/.test(said)) return 'Vegan';
  if (/vegetarian/.test(said)) return 'Vegetarian';
  return null;
}

// ---------------------------------------------------------------------------
// JSON-LD (schema.org/Recipe)
// ---------------------------------------------------------------------------

/** All JSON-LD blocks in a page, parsed; malformed blocks are skipped. */
export function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      // Some sites ship invalid JSON-LD; ignore that block
    }
  }
  return out;
}

/** Depth-first search for the first schema.org Recipe node. */
export function findRecipeNode(data: unknown): Record<string, unknown> | null {
  const stack: unknown[] = [data];
  while (stack.length) {
    const node = stack.shift();
    if (Array.isArray(node)) stack.push(...node);
    else if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (typeIs(obj, 'Recipe')) return obj;
      for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) if (obj[key]) stack.push(obj[key]);
    }
  }
  return null;
}

function imageFrom(v: unknown): string | null {
  for (const img of asArray(v as unknown[])) {
    if (typeof img === 'string' && /^https?:\/\//.test(img)) return img;
    if (img && typeof img === 'object') {
      const url = (img as Record<string, unknown>).url ?? (img as Record<string, unknown>).contentUrl;
      if (typeof url === 'string' && /^https?:\/\//.test(url)) return url;
    }
  }
  return null;
}

/** recipeInstructions can be a string, strings, HowToSteps or HowToSections. */
function stepsFrom(v: unknown): string[] {
  const steps: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node === 'string') {
      // A single block of text: split on line breaks or numbered steps
      node.split(/\n+|(?:^|\s)(?=\d+[.)]\s)/).map(cleanText).filter(Boolean).forEach((s) => steps.push(s.replace(/^\d+[.)]\s*/, '')));
    } else if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (obj.itemListElement) visit(obj.itemListElement);
      else {
        const text = cleanText(obj.text ?? obj.name);
        if (text) steps.push(text);
      }
    }
  };
  visit(v);
  return steps;
}

const keywordsFrom = (v: unknown): string[] =>
  asArray(v as string | string[]).flatMap((k) => (typeof k === 'string' ? k.split(',') : [])).map((k) => k.trim()).filter(Boolean);

/** Map a schema.org Recipe node to a draft. */
export function recipeFromSchema(node: Record<string, unknown>, sourceUrl: string | null): RecipeDraft {
  const ingredients = asArray((node.recipeIngredient ?? node.ingredients) as unknown[]).map(cleanText).filter(Boolean);
  const category = asArray(node.recipeCategory as string[]).map(cleanText).join(' ');
  const keywords = keywordsFrom(node.keywords);
  const title = cleanText(node.name) || 'Imported recipe';
  const nutrition = (node.nutrition ?? {}) as Record<string, unknown>;
  const declaredDiets = [...asArray(node.suitableForDiet as string[]).map(String), ...keywords, category];
  return {
    title,
    description: cleanText(node.description),
    imageUrl: imageFrom(node.image),
    ingredients,
    steps: stepsFrom(node.recipeInstructions),
    prepTimeMinutes: parseIsoDuration(node.prepTime),
    cookTimeMinutes: parseIsoDuration(node.cookTime) ?? (parseIsoDuration(node.prepTime) ? null : parseIsoDuration(node.totalTime)),
    servings: firstNumber(node.recipeYield),
    cuisine: asArray(node.recipeCuisine as string[]).map(cleanText).filter(Boolean)[0] ?? null,
    dietType: inferDietType(ingredients, declaredDiets),
    calories: firstNumber(nutrition.calories),
    mealTypes: inferMealTypes(category, keywords.join(' '), title),
    sourceUrl,
  };
}

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content=(["'])(.*?)\1/i)?.[2];
  return content ? cleanText(content) : null;
}

export type HtmlImportResult =
  | { ok: true; recipe: RecipeDraft }
  /** No structured recipe; `partial` has whatever the page title/image gave */
  | { ok: false; partial: Pick<RecipeDraft, 'title' | 'description' | 'imageUrl' | 'sourceUrl'> };

/** Read a recipe page. Uses schema.org JSON-LD; falls back to page metadata only. */
export function parseRecipeHtml(html: string, sourceUrl: string | null): HtmlImportResult {
  for (const block of extractJsonLd(html)) {
    const node = findRecipeNode(block);
    if (node) {
      const recipe = recipeFromSchema(node, sourceUrl);
      if (recipe.ingredients.length || recipe.steps.length) return { ok: true, recipe };
    }
  }
  return {
    ok: false,
    partial: {
      title: metaContent(html, 'og:title') ?? cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) ?? '',
      description: metaContent(html, 'og:description') ?? metaContent(html, 'description') ?? '',
      imageUrl: metaContent(html, 'og:image'),
      sourceUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// Pasted text
// ---------------------------------------------------------------------------

const INGREDIENTS_HEADING = /^(ingredients?|you(?:'ll)? need|shopping list)\s*:?$/i;
const STEPS_HEADING = /^(instructions?|directions?|method|steps?|preparation|how to make( it)?)\s*:?$/i;
const BULLET = /^\s*(?:[-*•▢◦·]|\d+[.)]|step\s*\d+[:.)]?)\s*/i;
const LOOKS_LIKE_INGREDIENT = /^\s*(?:[-*•▢◦·]\s*)?(\d|½|¼|¾|⅓|⅔|a\s|an\s|one\s|two\s|pinch|handful|salt|pepper)/i;

/**
 * Parse a recipe pasted as text: the first line is the title, then sections
 * under "Ingredients" and "Instructions" (or similar) headings. Without
 * headings, quantity-led lines are taken as ingredients and the rest as steps.
 */
export function parseRecipeText(text: string): RecipeDraft | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const title = lines[0].replace(/^#+\s*/, '');
  const ingredients: string[] = [];
  const steps: string[] = [];
  const intro: string[] = [];
  let section: 'intro' | 'ingredients' | 'steps' = 'intro';
  const sawHeading = lines.slice(1).some((l) => INGREDIENTS_HEADING.test(l.replace(/^#+\s*/, '')) || STEPS_HEADING.test(l.replace(/^#+\s*/, '')));

  for (const raw of lines.slice(1)) {
    const line = raw.replace(/^#+\s*/, '');
    if (INGREDIENTS_HEADING.test(line)) section = 'ingredients';
    else if (STEPS_HEADING.test(line)) section = 'steps';
    else if (!sawHeading) (LOOKS_LIKE_INGREDIENT.test(line) && steps.length === 0 ? ingredients : steps).push(line.replace(BULLET, ''));
    else if (section === 'ingredients') ingredients.push(line.replace(BULLET, ''));
    else if (section === 'steps') steps.push(line.replace(BULLET, ''));
    else intro.push(line);
  }
  if (ingredients.length === 0 && steps.length === 0) return null;
  return {
    title,
    description: intro.join(' '),
    imageUrl: null,
    ingredients,
    steps,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    servings: null,
    cuisine: null,
    dietType: inferDietType(ingredients),
    calories: null,
    mealTypes: inferMealTypes(title),
    sourceUrl: null,
  };
}

// ---------------------------------------------------------------------------
// URL safety (the server fetches what users paste)
// ---------------------------------------------------------------------------

/** True for IPv4/IPv6 literals in private, loopback, link-local or reserved ranges. */
export function isPrivateAddress(address: string): boolean {
  const a = address.replace(/^\[|\]$/g, '').toLowerCase();
  if (a.includes(':')) {
    if (a === '::' || a === '::1') return true;
    if (a.startsWith('::ffff:')) return isPrivateAddress(a.slice(7));
    return /^(fc|fd|fe8|fe9|fea|feb)/.test(a);
  }
  const parts = a.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [p, q] = parts;
  return p === 0 || p === 10 || p === 127 || (p === 169 && q === 254) || (p === 172 && q >= 16 && q <= 31) || (p === 192 && q === 168) || (p === 100 && q >= 64 && q <= 127) || p >= 224;
}

/** Validate a user-supplied recipe URL before the server fetches it. Returns an error message or null. */
export function recipeUrlError(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return 'Enter a full web address, starting with https://';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'Only web (http/https) links can be imported.';
  if (url.username || url.password) return 'Links with a username or password can’t be imported.';
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host === 'localhost' || /\.(local|localhost|internal|home|lan)$/.test(host) || isPrivateAddress(host)) {
    return 'That address isn’t a public website.';
  }
  return null;
}
