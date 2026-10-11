import { describe, expect, it } from 'vitest';
import { sortByMealType, toMealType } from './meal';
import { readGoals, readShopping } from './profile-answers';
import { foodIcon, foodGradientColors, initialsOf } from '../utils/food-visuals';

describe('meal types', () => {
  it('orders breakfast → snack, then by sort order', () => {
    const meals = [
      { id: 'd', mealType: 'dinner', sortOrder: 0 },
      { id: 's', mealType: 'snack', sortOrder: 0 },
      { id: 'b2', mealType: 'breakfast', sortOrder: 1 },
      { id: 'b1', mealType: 'breakfast', sortOrder: 0 },
    ];
    expect(sortByMealType(meals).map((m) => m.id)).toEqual(['b1', 'b2', 'd', 's']);
  });

  it('parses free-text meal types leniently', () => {
    expect(toMealType('Dinner')).toBe('dinner');
    expect(toMealType('brunch')).toBeUndefined();
    expect(toMealType(undefined)).toBeUndefined();
  });
});

describe('profile answers', () => {
  it('reads typed goals and ignores malformed values', () => {
    const goals = readGoals({ goals: { all: ['To eat healthier', 3], primary: 'To eat healthier', weekly: -1, targetWeight: 'x', habits: { choosyEater: 'No' } } });
    expect(goals).toEqual({ all: ['To eat healthier'], primary: 'To eat healthier', weekly: -1, targetWeight: undefined, habits: { choosyEater: 'No' } });
    expect(readGoals(null)).toEqual({ all: undefined, primary: undefined, targetWeight: undefined, weekly: undefined, habits: undefined });
  });

  it('reads shopping preferences', () => {
    expect(readShopping({ shopping: { budget: 150, tendency: 'Yes, I hunt for the bargains' } }).budget).toBe(150);
    expect(readShopping({ shopping: [] }).budget).toBeUndefined();
  });
});

describe('food visuals', () => {
  it('picks an emoji from the dish name, with a fallback', () => {
    expect(foodIcon('Salmon Teriyaki')).toBe('fish');
    expect(foodIcon('Shakshuka')).toBe('egg');
    expect(foodIcon('Veggie Fried Rice')).toBe('wheat');
    expect(foodIcon('Egg & Veggie Breakfast Scramble')).toBe('egg');
    expect(foodIcon('Mystery dish')).toBe('utensils');
  });

  it('gives a stable gradient per title', () => {
    expect(foodGradientColors('Tofu Pad Thai')).toEqual(foodGradientColors('Tofu Pad Thai'));
  });

  it('builds initials', () => {
    expect(initialsOf('Ethan', 'Minier')).toBe('EM');
    expect(initialsOf(null, undefined)).toBe('');
  });
});
