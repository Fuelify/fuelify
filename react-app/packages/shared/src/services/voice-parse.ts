// Speech → structured content.
//
// Speech recognition hands us plain words: "two pounds of ground beef a dozen
// eggs and some milk". These helpers turn that into list items, a recipe in
// the text format `parseRecipeText` reads, or a clean search query. Pure and
// deterministic, so results are the same on every device.

import { parseIngredient } from './ingredients';
import { guessCategoryAndZone } from './receipt-parser';
import type { PantryItemDraft } from '../models/external-data';

export interface SpokenItem {
  name: string;
  quantity: number;
  unit: string | null;
  /** The words this item came from */
  heard: string;
}

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const FRACTIONS: Record<string, number> = { half: 0.5, third: 1 / 3, quarter: 0.25, fourth: 0.25 };

const NUMBER_WORD = `(?:${[...Object.keys(TENS), ...Object.keys(ONES)].join('|')})(?:[- ](?:${Object.keys(ONES).join('|')}))?`;

function wordValue(phrase: string): number {
  const parts = phrase.toLowerCase().split(/[- ]/);
  return parts.reduce((sum, p) => sum + (TENS[p] ?? ONES[p] ?? 0), 0);
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** "two and a half pounds", "a dozen", "half a cup" → digits ("2.5 pounds", "12", "0.5 cup"). */
export function spokenNumbersToDigits(text: string): string {
  let s = text.trim();
  // Number words → digits ("twenty two" → 22)
  s = s.replace(new RegExp(`\\b${NUMBER_WORD}\\b`, 'gi'), (m) => String(wordValue(m)));
  // "2 and a half" / "2 and 1/2" → 2.5
  s = s.replace(/\b(\d+(?:\.\d+)?) and (?:a |an |one )?(half|third|quarter)\b/gi, (_, n, f) => String(round(Number(n) + FRACTIONS[f.toLowerCase()])));
  // "half a cup", "a half cup", "a quarter pound"
  s = s.replace(/\b(?:a |one )?(half|third|quarter) (?:a |an |of an? )?(?=[a-z])/gi, (_, f) => `${round(FRACTIONS[f.toLowerCase()])} `);
  // Dozens: "2 dozen" → 24, "a dozen" → 12, "half dozen" handled above → 0.5 dozen → 6
  s = s.replace(/\b(\d+(?:\.\d+)?) dozen\b/gi, (_, n) => String(round(Number(n) * 12)));
  s = s.replace(/\b(?:a |one )?dozen\b/gi, '12');
  // "a couple (of)", "a few", "a pair of"
  s = s.replace(/\ba couple(?: of)?\b/gi, '2').replace(/\ba pair of\b/gi, '2').replace(/\ba few\b/gi, '3');
  // "a/an <word>" at the start of an item means one
  s = s.replace(/(^|[,;]\s*|\band\s+)(?:an?|one)\s+(?=[a-z])/gi, '$11 ');
  return s.replace(/\s+/g, ' ').trim();
}

// Phrases where "and" is part of the name, not a separator
const AND_PHRASES = [
  'salt and pepper', 'mac and cheese', 'macaroni and cheese', 'half and half', 'peanut butter and jelly',
  'sour cream and onion', 'rice and beans', 'beans and rice', 'chips and salsa', 'oil and vinegar', 'sweet and sour',
  'cookies and cream', 'surf and turf', 'pork and beans', 'black and white', 'ham and cheese', 'bread and butter',
];
const AND_MARK = '\u0001';

const FILLER = /\b(um+|uh+|er+|okay|ok|so|like|please|thanks|thank you|let'?s see|i think|actually|oh)\b/gi;
const LEAD_IN = /^\s*(?:(?:i|we) (?:also )?(?:need|want|will need|'ll need|should get|gotta get)|(?:can you |could you |please )?(?:add|get|buy|pick up|grab|put)|don'?t forget|we'?re out of|we are out of|out of|and|also|plus|then|some|more)\b\s*/i;
const TAIL = /\b(?:to|on|onto|in|into) (?:the |my |our )?(?:shopping |grocery )?(?:list|cart)\b|\bfrom the store\b/gi;

// Names that really do repeat a word
const DOUBLED = new Set(['mahi', 'bang', 'chop', 'bora', 'cous', 'baba', 'yum']);

/**
 * Drop words the recognizer heard twice in a row: "almond almond milk" →
 * "almond milk", "ground beef ground beef" → "ground beef" (Android often
 * repeats words while listening).
 */
export function collapseRepeats(text: string): string {
  const words = text.trim().split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    // Longest repeated run (up to 3 words) starting here
    let skipped = false;
    for (let n = 3; n >= 1; n--) {
      const a = out.slice(-n).join(' ').toLowerCase();
      const b = words.slice(i, i + n).join(' ').toLowerCase().replace(/[,.;]$/, '');
      if (out.length >= n && a.replace(/[,.;]$/, '') === b && !(n === 1 && DOUBLED.has(b))) {
        i += n - 1;
        skipped = true;
        break;
      }
    }
    if (!skipped) out.push(words[i]);
  }
  return out.join(' ');
}

/** Split a spoken shopping list into item phrases. */
export function splitSpokenList(text: string): string[] {
  let s = ` ${collapseRepeats(text).toLowerCase()} `;
  for (const p of AND_PHRASES) s = s.split(p).join(p.replace(/ and /g, ` ${AND_MARK} `));
  // "two and a half pounds" is one amount
  s = s.replace(/\b(\w+) and (a |an |one )?(half|third|quarter)\b/g, `$1 ${AND_MARK} $2$3`);
  s = s.replace(FILLER, ' ').replace(TAIL, ' ');
  return s
    .split(/[,;.\n]|\band then\b|\bthen\b|\balso\b|\bplus\b|\bnext\b|\band\b|\bwith\b(?= \d)/)
    .map((p) => p.split(AND_MARK).join('and').replace(/\s+/g, ' ').trim())
    .map((p) => {
      let prev;
      do {
        prev = p;
        p = p.replace(LEAD_IN, '').trim();
      } while (p !== prev);
      return p;
    })
    .filter((p) => p.length > 1);
}

/**
 * "Two pounds of ground beef, a dozen eggs and some milk" →
 * [{2 lb ground beef}, {12 egg… }, {1 milk}]. Repeats are combined.
 */
export function parseSpokenItems(text: string): SpokenItem[] {
  const out: SpokenItem[] = [];
  for (const phrase of splitSpokenList(text)) {
    // Split first, then convert numbers, so "and a half" stays inside its item
    const digits = spokenNumbersToDigits(phrase);
    const parsed = parseIngredient(digits);
    const name = parsed.name.replace(/^(of|some|the|a|an)\s+/i, '').trim();
    if (!name || /^\d+(\.\d+)?$/.test(name)) continue;
    const item: SpokenItem = { name, quantity: parsed.quantity ?? 1, unit: parsed.unit, heard: phrase };
    const same = out.find((o) => o.name === item.name && o.unit === item.unit);
    if (same) same.quantity = round(same.quantity + item.quantity);
    else out.push(item);
  }
  return out;
}

/** A spoken search ("search for chicken tacos please") → "chicken tacos". */
export function spokenQuery(text: string): string {
  return text
    .replace(FILLER, ' ')
    .replace(/^\s*(?:(?:can you |could you |please )?(?:search|look|find|show me|look up)(?: for)?|(?:i'?m )?looking for|do (?:we|you) have)\s+/i, '')
    .replace(/[.?!]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const capitalize = (s: string) => s.replace(/^\s*\w/, (c) => c.toUpperCase());

/**
 * A dictated recipe → the text format `parseRecipeText` reads:
 * "Taco pasta. Ingredients: one pound ground beef, two cups pasta.
 *  Steps: brown the beef, then add the pasta…" →
 * "Taco pasta\n\nIngredients\n1 pound ground beef\n2 cups pasta\n\nInstructions\nBrown the beef\nAdd the pasta…"
 *
 * Without spoken section words, everything after the title is treated as steps.
 */
export function spokenRecipeToText(text: string): string {
  const s = collapseRepeats(text.replace(FILLER, ' ').replace(/\s+/g, ' ').trim());
  const ingAt = s.search(/\b(?:the )?ingredients?(?: are| list)?\b|\byou(?:'ll| will)? need\b/i);
  const stepAt = s.search(/\b(?:the )?(?:instructions|directions|steps|method)(?: are)?\b|\bto make (?:it|this)\b|\bhow to make it\b/i);

  const cut = (from: number, to: number) => (from < 0 ? '' : s.slice(from, to < 0 || to < from ? undefined : to));
  const firstMarker = [ingAt, stepAt].filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? -1;
  const titlePart = firstMarker >= 0 ? s.slice(0, firstMarker) : (s.match(/^[^.,]*/)?.[0] ?? '');
  const title = capitalize(
    titlePart
      .replace(/^\s*(?:this is |it'?s |the )?(?:(?:a|my|our) )?(?:recipe (?:is |for |called )?|called |named )?/i, '')
      .replace(/^(?:recipe (?:for|called) )/i, '')
      .replace(/[.,:;\s]+$/, '')
      .trim(),
  );

  const ingText = cut(ingAt, stepAt > ingAt ? stepAt : -1).replace(/^\s*(?:the )?ingredients?(?: are| list)?|^\s*you(?:'ll| will)? need/i, '');
  let stepText = stepAt >= 0
    ? cut(stepAt, ingAt > stepAt ? ingAt : -1).replace(/^\s*(?:the )?(?:instructions|directions|steps|method)(?: are)?|^\s*to make (?:it|this)|^\s*how to make it/i, '')
    : firstMarker < 0 ? s.slice(titlePart.length) : '';

  const ingredients = splitSpokenList(ingText.replace(/^[\s:,-]+/, ''))
    .map((p) => spokenNumbersToDigits(p))
    .filter((p) => !/^\d+(\.\d+)?$/.test(p));

  stepText = stepText.replace(/^[\s:,-]+/, '');
  const steps = stepText
    .split(/[.;!?\n]+|,?\s*\b(?:and then|then|next|after that|afterwards|once that'?s done|finally|lastly)\b,?|\bstep (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b[:,]?|\b(?:first|second|third|fourth|fifth)(?:ly)?\b,?/i)
    .map((x) => x?.trim())
    .filter((x): x is string => !!x && x.length > 2)
    .map((x) => capitalize(spokenNumbersToDigits(x)));

  return [title || 'My recipe', '', 'Ingredients', ...ingredients, '', 'Instructions', ...steps].join('\n').trim();
}

/** A spoken item as a new, sealed pantry item, filed in the fridge/freezer/shelf it likely belongs in. */
export function spokenItemToPantryDraft(item: SpokenItem): PantryItemDraft {
  const { category, storageZone } = guessCategoryAndZone(item.name);
  return { name: item.name, quantity: item.quantity, unit: item.unit ?? undefined, category, storageZone: storageZone ?? 'dry', status: 'sealed', remainingPct: 100 };
}
