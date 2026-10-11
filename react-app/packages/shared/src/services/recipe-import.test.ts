import { describe, expect, it } from 'vitest';
import {
  cleanText,
  inferDietType,
  inferMealTypes,
  isPrivateAddress,
  parseDurationText,
  parseIsoDuration,
  parseRecipeHtml,
  parseRecipeText,
  recipeUrlError,
} from './recipe-import';

const page = (jsonld: unknown, head = '') =>
  `<html><head><title>Site</title>${head}<script type="application/ld+json">${JSON.stringify(jsonld)}</script></head><body></body></html>`;

describe('recipe page (schema.org JSON-LD)', () => {
  it('reads a typical Recipe inside an @graph', () => {
    const html = page({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: 'Cooking Site' },
        {
          '@type': ['Recipe'],
          name: 'Lemony Chicken &amp; Orzo',
          description: '<p>A bright one-pan dinner.</p>',
          image: [{ '@type': 'ImageObject', url: 'https://example.com/orzo.jpg' }],
          recipeIngredient: ['1 lb chicken thighs', '1 cup orzo', '1 lemon'],
          recipeInstructions: [
            { '@type': 'HowToSection', name: 'Prep', itemListElement: [{ '@type': 'HowToStep', text: 'Season the chicken.' }] },
            { '@type': 'HowToStep', text: 'Simmer the orzo until tender.' },
          ],
          prepTime: 'PT10M',
          cookTime: 'PT1H5M',
          recipeYield: ['4', '4 servings'],
          recipeCuisine: 'Greek',
          recipeCategory: 'Dinner',
          nutrition: { calories: '540 kcal' },
        },
      ],
    });
    const r = parseRecipeHtml(html, 'https://example.com/orzo');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recipe).toMatchObject({
      title: 'Lemony Chicken & Orzo',
      description: 'A bright one-pan dinner.',
      imageUrl: 'https://example.com/orzo.jpg',
      ingredients: ['1 lb chicken thighs', '1 cup orzo', '1 lemon'],
      steps: ['Season the chicken.', 'Simmer the orzo until tender.'],
      prepTimeMinutes: 10,
      cookTimeMinutes: 65,
      servings: 4,
      cuisine: 'Greek',
      dietType: 'Omnivore',
      calories: 540,
      mealTypes: ['dinner', 'lunch'],
      sourceUrl: 'https://example.com/orzo',
    });
  });

  it('handles instructions as one block of text and declared vegan diets', () => {
    const html = page([{ '@type': 'Recipe', name: 'Overnight Oats', recipeIngredient: ['1 cup oats', '1 cup oat milk'], recipeInstructions: '1. Mix everything. 2. Chill overnight.', suitableForDiet: 'https://schema.org/VeganDiet', recipeCategory: ['Breakfast'] }]);
    const r = parseRecipeHtml(html, null);
    expect(r.ok && r.recipe.steps).toEqual(['Mix everything.', 'Chill overnight.']);
    expect(r.ok && r.recipe.dietType).toBe('Vegan');
    expect(r.ok && r.recipe.mealTypes).toEqual(['breakfast', 'lunch']);
  });

  it('skips malformed JSON-LD and falls back to page metadata', () => {
    const html = `<html><head><title>Grandma's Pie | Blog</title><meta property="og:title" content="Grandma's Pie"><meta property="og:image" content="https://example.com/pie.jpg"><script type="application/ld+json">{oops</script></head></html>`;
    const r = parseRecipeHtml(html, 'https://example.com/pie');
    expect(r).toEqual({ ok: false, partial: { title: "Grandma's Pie", description: '', imageUrl: 'https://example.com/pie.jpg', sourceUrl: 'https://example.com/pie' } });
  });
});

describe('pasted recipe text', () => {
  it('reads title, intro, ingredients and steps under headings', () => {
    const r = parseRecipeText(`# Weeknight Dal
Cozy and quick.
Ingredients:
- 1 cup red lentils
- 1 can coconut milk
Instructions
1. Rinse the lentils.
2) Simmer everything for 20 minutes.`);
    expect(r).toMatchObject({
      title: 'Weeknight Dal',
      description: 'Cozy and quick.',
      ingredients: ['1 cup red lentils', '1 can coconut milk'],
      steps: ['Rinse the lentils.', 'Simmer everything for 20 minutes.'],
      dietType: null,
    });
  });

  it('reads a whole copied recipe page, skipping navigation, ads and everything after the steps', () => {
    const r = parseRecipeText(`Skip to content
Dinners > Main Dishes
Taco Pasta
Submitted by Home Cook
Updated on May 1, 2024
Save
Rate
Prep Time:
10 mins
Cook Time: 20 mins
Total Time: 30 mins
Servings: 6
Jump to Nutrition Facts
Advertisement
Ingredients
Original recipe (1X) yields 6 servings
1/2x 1x 2x
1 pound ground beef
1 (1 ounce) packet taco seasoning
8 ounces small shell pasta
Directions
Step 1
Brown the beef in a large skillet; drain.
Step 2
Stir in the seasoning, pasta and 2 cups water; simmer until the pasta is tender, about 15 minutes.
Recipe Tips
Use ground turkey for a lighter version.
Nutrition Facts (per serving)
412 Calories
I Made It`);
    expect(r).toMatchObject({
      title: 'Taco Pasta',
      ingredients: ['1 pound ground beef', '1 (1 ounce) packet taco seasoning', '8 ounces small shell pasta'],
      steps: ['Brown the beef in a large skillet; drain.', 'Stir in the seasoning, pasta and 2 cups water; simmer until the pasta is tender, about 15 minutes.'],
      cookTimeMinutes: 20,
      servings: 6,
      dietType: 'Omnivore',
    });
  });

  it('reads duration text', () => {
    expect(parseDurationText('1 hr 20 mins')).toBe(80);
    expect(parseDurationText('45 minutes')).toBe(45);
    expect(parseDurationText('soon')).toBeNull();
  });

  it('guesses sections without headings and rejects non-recipes', () => {
    const r = parseRecipeText('Toast\n2 slices bread\n1 tbsp butter\nToast the bread and butter it.');
    expect(r?.ingredients).toEqual(['2 slices bread', '1 tbsp butter']);
    expect(r?.steps).toEqual(['Toast the bread and butter it.']);
    expect(parseRecipeText('just one line')).toBeNull();
  });
});

describe('helpers', () => {
  it('parses ISO durations', () => {
    expect(parseIsoDuration('PT1H30M')).toBe(90);
    expect(parseIsoDuration('P0DT0H45M')).toBe(45);
    expect(parseIsoDuration('PT0S')).toBeNull();
    expect(parseIsoDuration('45 minutes')).toBeNull();
  });

  it('cleans text', () => {
    expect(cleanText('<b>Mac &amp; cheese</b>&nbsp;&#8211; &frac12; cup')).toBe('Mac & cheese – ½ cup');
  });

  it('infers diet conservatively', () => {
    expect(inferDietType(['2 salmon fillets'])).toBe('Pescatarian');
    expect(inferDietType(['4 slices bacon', '1 cod fillet'])).toBe('Omnivore');
    expect(inferDietType(['1 cup rice'])).toBeNull();
    expect(inferDietType(['1 cup rice'], ['vegetarian'])).toBe('Vegetarian');
  });

  it('infers meal types', () => {
    expect(inferMealTypes('Brunch')).toEqual(['breakfast', 'lunch']);
    expect(inferMealTypes('Dessert')).toEqual(['snack']);
    expect(inferMealTypes('Caesar Salad')).toEqual(['lunch', 'dinner']);
    expect(inferMealTypes('Beef stew')).toEqual(['dinner', 'lunch']);
  });

  it('only allows public web URLs', () => {
    expect(recipeUrlError('https://www.example.com/recipe')).toBeNull();
    expect(recipeUrlError('example.com/recipe')).toMatch(/full web address/);
    expect(recipeUrlError('ftp://example.com/x')).toMatch(/http/);
    expect(recipeUrlError('http://localhost:3000/x')).toMatch(/public/);
    expect(recipeUrlError('http://192.168.1.10/x')).toMatch(/public/);
    expect(recipeUrlError('http://[::1]/x')).toMatch(/public/);
    expect(recipeUrlError('https://user:pw@example.com/')).toMatch(/password/);
    expect(isPrivateAddress('10.0.0.5')).toBe(true);
    expect(isPrivateAddress('172.20.1.1')).toBe(true);
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
    expect(isPrivateAddress('::ffff:127.0.0.1')).toBe(true);
  });
});
