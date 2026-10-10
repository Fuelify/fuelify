import { describe, expect, it } from 'vitest';
import { cmToFeetInches, displayToKg, feetInchesToCm, formatHeight, formatWeight, kgToDisplay, toUnitSystem, weeklyWeightLabel } from './units';

describe('units', () => {
  it('converts height between cm and feet/inches', () => {
    expect(feetInchesToCm(5, 11)).toBe(180.3);
    expect(cmToFeetInches(180.3)).toEqual({ feet: 5, inches: 11 });
    expect(cmToFeetInches(feetInchesToCm(6, 0))).toEqual({ feet: 6, inches: 0 });
  });

  it('converts weight for display and back', () => {
    expect(kgToDisplay(80, 'Metric')).toBe(80);
    expect(kgToDisplay(80, 'Imperial')).toBe(176.4);
    expect(displayToKg(176.4, 'Imperial')).toBeCloseTo(80, 1);
    expect(displayToKg(80, 'Metric')).toBe(80);
  });

  it('formats for each unit system', () => {
    expect(formatWeight(80, 'Metric')).toBe('80 kg');
    expect(formatHeight(180.3, 'Imperial')).toBe('5′ 11″');
    expect(formatHeight(180.3, 'Metric')).toBe('180 cm');
  });

  it('labels weekly weight goals', () => {
    expect(weeklyWeightLabel(0, 'Imperial')).toBe('Maintain my current weight');
    expect(weeklyWeightLabel(-1, 'Imperial')).toBe('Lose 1.0 lbs per week');
    expect(weeklyWeightLabel(0.5, 'Metric')).toBe('Gain 0.23 kg per week');
  });

  it('defaults unknown unit strings to Imperial', () => {
    expect(toUnitSystem('Metric')).toBe('Metric');
    expect(toUnitSystem(null)).toBe('Imperial');
    expect(toUnitSystem('metric')).toBe('Imperial');
  });
});
