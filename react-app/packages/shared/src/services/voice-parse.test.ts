import { describe, expect, it } from 'vitest';
import { parseSpokenItems, spokenItemToPantryDraft, spokenNumbersToDigits, spokenQuery, spokenRecipeToText } from './voice-parse';
import { parseRecipeText } from './recipe-import';

const brief = (text: string) => parseSpokenItems(text).map((i) => [i.quantity, i.unit, i.name]);

describe('spoken numbers', () => {
  it('turns number words, fractions and dozens into digits', () => {
    expect(spokenNumbersToDigits('two and a half pounds')).toBe('2.5 pounds');
    expect(spokenNumbersToDigits('twenty two eggs')).toBe('22 eggs');
    expect(spokenNumbersToDigits('half a cup of milk')).toBe('0.5 cup of milk');
    expect(spokenNumbersToDigits('a dozen eggs')).toBe('12 eggs');
    expect(spokenNumbersToDigits('two dozen eggs')).toBe('24 eggs');
    expect(spokenNumbersToDigits('a couple of avocados')).toBe('2 avocados');
    expect(spokenNumbersToDigits('an onion')).toBe('1 onion');
  });
});

describe('spoken shopping list', () => {
  it('splits items and reads amounts and units', () => {
    expect(brief('I need two pounds of ground beef, a dozen eggs and some milk')).toEqual([
      [2, 'lb', 'ground beef'],
      [12, null, 'eggs'],
      [1, null, 'milk'],
    ]);
  });

  it('keeps "and" inside names and amounts', () => {
    expect(brief('add salt and pepper and two and a half pounds of chicken thighs then mac and cheese')).toEqual([
      [1, null, 'salt and pepper'],
      [2.5, 'lb', 'chicken thighs'],
      [1, null, 'mac and cheese'],
    ]);
  });

  it('handles stores units, lead-ins and the "to the list" tail', () => {
    expect(brief('um add a gallon of whole milk to the list, also three cans of black beans plus a loaf of bread')).toEqual([
      [1, 'gallon', 'whole milk'],
      [3, 'can', 'black beans'],
      [1, 'loaf', 'bread'],
    ]);
  });

  it('combines repeats', () => {
    expect(brief('two avocados and then three avocados')).toEqual([[5, null, 'avocados']]);
  });
});

describe('spoken search', () => {
  it('drops the request words', () => {
    expect(spokenQuery('search for chicken tacos please')).toBe('chicken tacos');
    expect(spokenQuery('Do we have pepper jack cheese?')).toBe('pepper jack cheese');
  });
});

describe('spoken recipe', () => {
  const said =
    "This is my Taco Pasta. The ingredients are one pound ground beef, two cups of shells, one packet of taco seasoning and a cup of shredded cheddar. " +
    'The steps are: first boil the shells. Then brown the beef with the taco seasoning, and then stir in the pasta. Finally top with the cheddar.';

  it('becomes title, ingredients and steps that the text importer reads', () => {
    const text = spokenRecipeToText(said);
    expect(text.split('\n')[0]).toBe('Taco Pasta');
    const draft = parseRecipeText(text)!;
    expect(draft.title).toBe('Taco Pasta');
    expect(draft.ingredients).toEqual(['1 pound ground beef', '2 cups of shells', '1 packet of taco seasoning', '1 cup of shredded cheddar']);
    expect(draft.steps).toEqual(['Boil the shells', 'Brown the beef with the taco seasoning', 'Stir in the pasta', 'Top with the cheddar']);
  });

  it('treats everything after the title as steps when no sections are spoken', () => {
    const text = spokenRecipeToText('quick oatmeal. boil a cup of water then stir in half a cup of oats');
    expect(text).toContain('Instructions\nBoil a cup of water\nStir in 0.5 cup of oats');
  });
});

describe('spoken pantry items', () => {
  it('files items by where they keep', () => {
    const [milk, beans] = parseSpokenItems('a gallon of milk and two cans of black beans').map(spokenItemToPantryDraft);
    expect(milk).toMatchObject({ name: 'milk', quantity: 1, unit: 'gallon', storageZone: 'cool', status: 'sealed' });
    expect(beans).toMatchObject({ name: 'black beans', quantity: 2, unit: 'can' });
  });
});
