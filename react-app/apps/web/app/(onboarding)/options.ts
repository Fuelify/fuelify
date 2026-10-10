// Answer options ported verbatim from lib/screens/onboarding/*/screen.dart

export const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say', 'Prefer to self describe'];

export const DIET_OPTIONS: { title: string; image: string | null }[] = [
  { title: 'Omnivore', image: '/onboarding/diet/omnivore.jpg' },
  { title: 'Pescatarian', image: '/onboarding/diet/pescatarian.jpg' },
  { title: 'Vegetarian', image: '/onboarding/diet/vegetarian.jpg' },
  { title: 'Vegan', image: '/onboarding/diet/vegan.jpg' },
  { title: 'Raw', image: '/onboarding/diet/raw.jpg' },
  { title: 'Other', image: null },
];

export const ALLERGEN_OPTIONS = [
  'Dairy (Lactose)', 'Gluten', 'Peanuts', 'Tree Nuts', 'Soy',
  'Sesame', 'Eggs', 'Crustaceans', 'Fish', 'Other',
];

export const CALORIE_OPTIONS = [
  'Yes, I always check how many calories a food product has before buying or eating',
  'No, I eat whatever I desire regardless of the calories',
];

export const CHOOSY_OPTIONS = ['Yes', 'No'];

export const GOAL_OPTIONS = [
  'To lose weight',
  'To eat healthier',
  'To get more fit',
  'To maintain weight and support my training',
  'To build more muscle',
  'To gain weight',
];

/** Weekly change in lbs (negative = lose); labels adapt to the chosen units */
export const WEEKLY_WEIGHT_OPTIONS = [-2, -1.5, -1, -0.5, 0, 0.5, 1];

export const SHOPPING_TENDENCY_OPTIONS = [
  'Yes, not only do I hunt for bargains, I go to multiple stores to get the best deals',
  'Yes, I hunt for the bargains',
  'No, I buy nothing but brand name products and at whichever store is most convenient',
];

export const PRICE_IMPACT_OPTIONS = ['Yes', 'Sometimes', 'No'];

export const ACTIVITY_OPTIONS = [
  { title: 'Sedentary', emoji: '🪑', body: 'Most of your day is spent sitting (e.g. desk job)' },
  { title: 'Lightly Active', emoji: '🚶', body: 'Some of your day is spent standing or walking (e.g. teacher)' },
  { title: 'Moderately Active', emoji: '🏃', body: 'A good part of your day is spent up and moving (e.g. food server, delivery person)' },
  { title: 'Very Active', emoji: '🏗️', body: 'Most of your day is spent doing hard physical activity (e.g. construction worker)' },
];

export const DEVICE_OPTIONS = [
  { name: 'Garmin', image: '/onboarding/devices/garmin.jpg', body: 'Sync steps, workouts and calories burned' },
  { name: 'Fitbit', image: '/onboarding/devices/fitbit.jpg', body: 'Sync activity, sleep and heart rate' },
  { name: 'Apple Watch', image: '/onboarding/devices/apple.jpg', body: 'Sync Apple Health activity data' },
];

// ----- Unit conversions (profile stores cm and kg) -----

type Units = 'Metric' | 'Imperial';
const LB_PER_KG = 2.20462;

export function cmToFeetInches(cm: number | null) {
  if (!cm) return { feet: 5, inches: 6 };
  const totalIn = Math.round(cm / 2.54);
  return { feet: Math.floor(totalIn / 12), inches: totalIn % 12 };
}

export function feetInchesToCm(feet: number, inches: number) {
  return Math.round((feet * 12 + inches) * 2.54 * 10) / 10;
}

export function kgToDisplay(kg: number, units: Units) {
  return units === 'Metric' ? Math.round(kg * 10) / 10 : Math.round(kg * LB_PER_KG * 10) / 10;
}

export function displayToKg(value: number, units: Units) {
  return units === 'Metric' ? value : Math.round((value / LB_PER_KG) * 100) / 100;
}

export function formatWeight(kg: number, units: Units) {
  return `${kgToDisplay(kg, units)} ${units === 'Metric' ? 'kg' : 'lbs'}`;
}

export function formatHeight(cm: number, units: Units) {
  if (units === 'Metric') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}′ ${inches}″`;
}

export function weeklyLabel(lbs: number, units: Units) {
  if (lbs === 0) return 'Maintain my current weight';
  const verb = lbs < 0 ? 'Lose' : 'Gain';
  const amount = units === 'Metric' ? `${Math.round((Math.abs(lbs) / LB_PER_KG) * 100) / 100} kg` : `${Math.abs(lbs).toFixed(1)} lbs`;
  return `${verb} ${amount} per week`;
}
