// Recipe import: turn a recipe web page (or pasted text) into a recipe draft.
//
// Most recipe sites publish schema.org/Recipe JSON-LD for search engines, so
// that's the primary source. Pasted text uses simple section headings.
// Pure functions only — fetching the page happens server-side (web API route).

import type { MealType } from '../models/meal';
import type { Nutrition } from '../models/nutrition';

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
  /** Per serving, beyond calories */
  nutrition: Nutrition;
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
    nutrition: nutritionFromSchema(nutrition),
    mealTypes: inferMealTypes(category, keywords.join(' '), title),
    sourceUrl,
  };
}

/** schema.org NutritionInformation ("30 g", "450 mg") to our per-serving fields. */
function nutritionFromSchema(n: Record<string, unknown>): Nutrition {
  const out: Nutrition = {};
  const set = (key: keyof Nutrition, v: unknown) => {
    const num = firstNumber(v);
    if (num != null) out[key] = num;
  };
  set('proteinG', n.proteinContent);
  set('carbsG', n.carbohydrateContent);
  set('fatG', n.fatContent);
  set('fiberG', n.fiberContent);
  set('sugarG', n.sugarContent);
  set('sodiumMg', n.sodiumContent);
  return out;
}

/**
 * Nutrition from label text, in either order ("Protein 61g", "61g Protein") and
 * on one line or many — e.g. a copied "Nutrition Facts" panel.
 */
export function parseNutritionText(text: string): { calories: number | null; nutrition: Nutrition } {
  const t = text.replace(/\s+/g, ' ');
  const LABELS: [keyof Nutrition, string, 'g' | 'mg'][] = [
    ['proteinG', 'protein', 'g'],
    ['carbsG', 'total carbohydrates?|carbohydrates?|total carbs|carbs', 'g'],
    ['fatG', 'total fat|(?<!saturated |trans |unsaturated )fat', 'g'],
    ['fiberG', 'dietary fiber|fiber|fibre', 'g'],
    ['sugarG', 'total sugars?|sugars?', 'g'],
    ['sodiumMg', 'sodium', 'mg'],
  ];
  const labelFirst = (label: string, unit: string) => new RegExp(`(?:^|[^a-z])(?:${label})\\s*:?\\s*(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`, 'i');
  const valueFirst = (label: string, unit: string) => new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}\\s+(?:${label})\\b`, 'i');
  // A panel is written one way throughout ("Protein 61g" or "61g Protein").
  // Mixing both would misread "Carbs 37g Fiber 3g" as 37g of fiber.
  // Whichever comes first in the panel, a nutrient name or an amount, sets the order.
  const body = t.replace(/calories\s*:?\s*\d+|\d+\s*(?:k?cal|calories)\b/gi, ' ');
  const firstLabel = body.search(new RegExp(LABELS.map(([, label]) => `(?:${label})`).join('|'), 'i'));
  const firstAmount = body.search(/\d+(?:\.\d+)?\s*m?g\b/i);
  const order = firstAmount >= 0 && (firstLabel < 0 || firstAmount < firstLabel) ? valueFirst : labelFirst;
  const nutrition: Nutrition = {};
  for (const [key, label, unit] of LABELS) {
    const m = t.match(order(label, unit));
    if (m) nutrition[key] = Math.round(Number(m[1]));
  }
  const cal = t.match(/calories\s*:?\s*(\d{2,4})\b|(\d{2,4})\s*(?:k?cal|calories)\b/i);
  return { calories: cal ? Number(cal[1] ?? cal[2]) : null, nutrition };
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
/** Where a recipe page's useful text ends (copied whole pages run on into this) */
const END_HEADING = /^(nutrition( facts)?|recipe (tips?|notes?)|tips( & tricks)?|notes?|cook'?s notes?|editor'?s notes?|reviews?|\d[\d,]* (reviews?|ratings?)|i made it|you('ll)? (also )?(like|love)|related( recipes)?|more recipes|explore more|did you make this)\b/i;
/** Page furniture to drop wherever it appears */
const NOISE = /^(advertisement|ad|skip to content|jump to (recipe|nutrition facts?)|save|saved|rate|print|share|pin|email|cook mode|\(keep screen awake\)|original recipe.*yields.*|\d\/\dx|\d+x( \d+x)*|1\/2x 1x 2x|us|metric|step \d+|photo:?.*|credit:?.*)$/i;
/** Lines before the title on a copied page (site navigation, breadcrumbs) */
const NOT_A_TITLE = /^(skip to content|home|menu|search|log ?in|sign ?up|subscribe|newsletters?|magazine|sweepstakes|recipes?|dinners?|main dishes|breakfast|lunch|desserts?|.*›.*|.*>.*|.*\/.*)$/i;
const BULLET = /^\s*(?:[-*•▢◦·]|\d+[.)]|step\s*\d+[:.)]?)\s*/i;
const LOOKS_LIKE_INGREDIENT = /^\s*(?:[-*•▢◦·]\s*)?(\d|½|¼|¾|⅓|⅔|a\s|an\s|one\s|two\s|pinch|handful|salt|pepper)/i;

/** "1 hr 20 mins", "45 minutes", "1 hour" → minutes */
export function parseDurationText(s: string): number | null {
  const h = s.match(/(\d+)\s*(h|hr|hrs|hour|hours)\b/i);
  const m = s.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/i);
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return total > 0 ? total : null;
}

/** A readable title from a recipe URL slug: ".../taco-pasta-recipe-8644589" → "Taco Pasta". */
export function titleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  const slug = path.split('/').filter(Boolean).reverse().find((seg) => /[a-z]{3}/i.test(seg) && !/^(recipes?|\d+)$/i.test(seg));
  if (!slug) return null;
  const words = decodeURIComponent(slug)
    .replace(/\.[a-z]+$/i, '')
    .split(/[-_]+/)
    .filter((w) => w && !/^\d+$/.test(w) && !/^recipes?$/i.test(w));
  if (words.length === 0) return null;
  return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isTitleCase = (s: string) => {
  const words = s.split(/\s+/).filter((w) => /^[a-z]/i.test(w) && w.length > 3);
  return words.length > 0 && words.every((w) => /^[A-Z]/.test(w));
};
/** Lines a title can't be: sentences, bylines, details */
const looksLikeProse = (l: string) => l.length > 80 || /[.!?]$/.test(l);
const ANCHOR = /^(submitted by|recipe by|by\s|\d[\d,]* (ratings?|reviews?)|prep(aration)?( time)?\s*:|cook(ing)?( time)?\s*:|total( time)?\s*:|servings?\s*:|serves\s*:?|yield\s*:)/i;

/**
 * Parse a recipe pasted as text, from a note or a whole copied recipe page:
 * the title, "Prep Time / Cook Time / Servings" details, then sections under
 * "Ingredients" and "Instructions"/"Directions" headings, and an optional
 * "Nutrition Facts" panel. Page furniture and everything else after the steps
 * (tips, reviews) is dropped. Without headings, quantity-led lines are taken
 * as ingredients. `titleHint` (e.g. from the page URL) wins when it matches.
 */
export function parseRecipeText(text: string, { titleHint }: { titleHint?: string | null } = {}): RecipeDraft | null {
  const strip = (l: string) => l.trim().replace(/^#+\s*/, '');
  const all = text.split(/\r?\n/).map(strip).filter((l) => l && !NOISE.test(l));
  if (all.length < 2) return null;

  // Title: the hint if the page contains it; otherwise the last title-like
  // line before the byline/details/ingredients (copied pages start with the
  // site name and menus), falling back to the first real line.
  const anchorAt = all.findIndex((l) => ANCHOR.test(l) || INGREDIENTS_HEADING.test(l) || STEPS_HEADING.test(l));
  const head = all.slice(0, anchorAt < 0 ? 1 : anchorAt).map((l, i) => ({ l, i })).filter(({ l }) => l.length > 2 && !NOT_A_TITLE.test(l) && !looksLikeProse(l));
  const hinted = titleHint ? all.findIndex((l) => normalize(l) === normalize(titleHint)) : -1;
  const pick = hinted >= 0 ? { l: all[hinted], i: hinted } : [...head].reverse().find(({ l }) => isTitleCase(l)) ?? head[0];
  const title = pick?.l ?? titleHint ?? all[0];
  const titleAt = pick?.i ?? -1;
  const lines = all.filter((_, i) => i !== titleAt && !(titleAt >= 0 && i < titleAt && !looksLikeProse(all[i])));

  const ingredients: string[] = [];
  const steps: string[] = [];
  const intro: string[] = [];
  const nutritionLines: string[] = [];
  let prep: number | null = null;
  let cook: number | null = null;
  let total: number | null = null;
  let servings: number | null = null;
  let section: 'intro' | 'ingredients' | 'steps' | 'nutrition' | 'end' = 'intro';
  const sawHeading = lines.some((l) => INGREDIENTS_HEADING.test(l) || STEPS_HEADING.test(l));

  for (const line of lines) {
    if (INGREDIENTS_HEADING.test(line)) { section = 'ingredients'; continue; }
    if (STEPS_HEADING.test(line)) { section = 'steps'; continue; }
    if (/^nutrition( facts)?\b/i.test(line)) { section = 'nutrition'; nutritionLines.push(line.replace(/^nutrition( facts)?/i, '')); continue; }
    if (section !== 'intro' && END_HEADING.test(line)) { section = 'end'; continue; }
    if (section === 'end') continue;
    if (section === 'nutrition') { nutritionLines.push(line); continue; }

    // Recipe details lines, e.g. "Prep Time: 10 mins", "Servings: 6"
    const detail = line.match(/^(prep(?:aration)?(?: time)?|cook(?:ing)?(?: time)?|total(?: time)?|servings|serves|yield)\s*:?\s*(.+)$/i);
    if (detail && section !== 'steps') {
      const key = detail[1].toLowerCase();
      if (key.startsWith('prep')) prep = parseDurationText(detail[2]);
      else if (key.startsWith('cook')) cook = parseDurationText(detail[2]);
      else if (key.startsWith('total')) total = parseDurationText(detail[2]);
      else servings = Number(detail[2].match(/\d+/)?.[0]) || null;
      continue;
    }

    const item = line.replace(BULLET, '').trim();
    if (!item) continue;
    if (!sawHeading) (LOOKS_LIKE_INGREDIENT.test(line) && steps.length === 0 ? ingredients : steps).push(item);
    else if (section === 'ingredients') ingredients.push(item);
    else if (section === 'steps') steps.push(item);
    else intro.push(line);
  }
  if (ingredients.length === 0 && steps.length === 0) return null;
  const facts = parseNutritionText(nutritionLines.join('\n'));
  return {
    title,
    // Copied pages put bylines and dates here; keep the blurb, briefly
    description: intro.filter((l) => !/^(submitted by|recipe by|by |updated|published|posted|tested by|\d+ (reviews?|ratings?))/i.test(l) && !NOT_A_TITLE.test(l)).slice(0, 2).join(' '),
    imageUrl: null,
    ingredients,
    steps,
    prepTimeMinutes: prep,
    cookTimeMinutes: cook ?? (prep == null ? total : null),
    servings,
    cuisine: null,
    dietType: inferDietType(ingredients),
    calories: facts.calories,
    nutrition: facts.nutrition,
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
