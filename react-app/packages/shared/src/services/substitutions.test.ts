import { describe, expect, it } from 'vitest';
import { applySwaps, readSwaps, suggestSwaps, swapLine, withSwap } from './substitutions';

describe('suggestSwaps', () => {
  it('offers turkey and plant-based options for ground beef', () => {
    const names = suggestSwaps('1 pound ground beef').map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['ground turkey', 'Beyond Beef crumbles']));
  });

  it('only shows swaps that fit the diet and allergens', () => {
    expect(suggestSwaps('1 pound ground beef', { diet: 'Vegan' }).every((s) => s.diet === 'Vegan')).toBe(true);
    const cheese = suggestSwaps('1 cup shredded sharp Cheddar cheese', { allergens: ['Dairy (Lactose)'] }).map((s) => s.name);
    expect(cheese).toEqual(['dairy-free cheddar shreds']);
    expect(suggestSwaps('2 tbsp peanut butter', { allergens: ['Tree Nuts'] }).map((s) => s.name)).toEqual(['sunflower seed butter']);
    expect(suggestSwaps('1 tbsp almond butter').map((s) => s.name)).toEqual(['peanut butter', 'sunflower seed butter']);
  });

  it('suggests pepper jack for cheddar and nothing for unknown items', () => {
    expect(suggestSwaps('1 cup shredded sharp Cheddar cheese').map((s) => s.name)[0]).toBe('pepper jack cheese');
    expect(suggestSwaps('1 tsp za’atar')).toEqual([]);
  });
});

describe('swapLine', () => {
  it.each([
    ['1 pound ground beef', 'ground turkey', '1 pound ground turkey'],
    ['½ cup diced onion', 'shallot', '½ cup shallot'],
    ['1 1/2 cups chicken broth', 'vegetable broth', '1 1/2 cups vegetable broth'],
    ['2-3 cloves garlic, minced', 'garlic powder', '2-3 cloves garlic powder'],
    ['1 (8 ounce) package processed cheese (such as Velveeta®), cubed', 'pepper jack cheese', '1 (8 ounce) package pepper jack cheese'],
    ['2 large eggs', 'JUST Egg', '2 JUST Egg'],
    ['Salt to taste', 'sea salt', 'sea salt'],
  ])('%s → %s', (original, name, expected) => {
    expect(swapLine(original, name)).toBe(expected);
  });
});

describe('applying swaps', () => {
  const ingredients = ['1 pound ground beef', '1 cup cheddar cheese'];
  it('replaces matching lines and toggles cleanly', () => {
    let swaps = withSwap([], '1 pound ground beef', '1 pound ground turkey');
    expect(applySwaps(ingredients, swaps)).toEqual(['1 pound ground turkey', '1 cup cheddar cheese']);
    swaps = withSwap(swaps, '1 pound ground beef', '1 pound Beyond Beef crumbles');
    expect(swaps).toHaveLength(1);
    expect(withSwap(swaps, '1 pound ground beef', null)).toEqual([]);
    expect(withSwap(swaps, '1 pound ground beef', '1 pound ground beef')).toEqual([]);
    expect(readSwaps([{ original: 'a', replacement: 'b' }, { original: 1 }, 'x'])).toEqual([{ original: 'a', replacement: 'b' }]);
  });
});
