// Unit conversions. Profiles store canonical metric values (height cm, weight kg);
// these convert to/from what the user sees for their chosen unit system.

export type UnitSystem = 'Metric' | 'Imperial';

export const LB_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

/** Normalizes the free-text `profiles.units` column. Defaults to Imperial (Flutter default). */
export function toUnitSystem(units: string | null | undefined): UnitSystem {
  return units === 'Metric' ? 'Metric' : 'Imperial';
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalIn = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalIn / 12), inches: totalIn % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return round((feet * 12 + inches) * CM_PER_INCH, 1);
}

export function kgToDisplay(kg: number, units: UnitSystem): number {
  return units === 'Metric' ? round(kg, 1) : round(kg * LB_PER_KG, 1);
}

export function displayToKg(value: number, units: UnitSystem): number {
  return units === 'Metric' ? value : round(value / LB_PER_KG, 2);
}

export function formatWeight(kg: number, units: UnitSystem): string {
  return `${kgToDisplay(kg, units)} ${units === 'Metric' ? 'kg' : 'lbs'}`;
}

export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === 'Metric') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}′ ${inches}″`;
}

/** Label for a weekly weight goal stored as lbs/week (negative = lose). */
export function weeklyWeightLabel(lbsPerWeek: number, units: UnitSystem): string {
  if (lbsPerWeek === 0) return 'Maintain my current weight';
  const verb = lbsPerWeek < 0 ? 'Lose' : 'Gain';
  const amount = units === 'Metric'
    ? `${round(Math.abs(lbsPerWeek) / LB_PER_KG, 2)} kg`
    : `${Math.abs(lbsPerWeek).toFixed(1)} lbs`;
  return `${verb} ${amount} per week`;
}
