// Ported from: lib/models/onboarding.dart

export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  completed: boolean;
}

export const ONBOARDING_STEPS = [
  'welcome',
  'profile',
  'personal-details',
  'diet',
  'allergens',
  'eating-habits',
  'health-goals',
  'primary-goal',
  'weight-goals',
  'activity-level',
  'device-connections',
  'submission',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * Household setup, separate from each person's onboarding: done once per
 * household (whoever gets there first), skipped by people who join a
 * household that's already set up.
 */
export const HOUSEHOLD_SETUP_STEPS = ['household', 'shopping', 'members'] as const;
export type HouseholdSetupStep = (typeof HOUSEHOLD_SETUP_STEPS)[number];

/** Does this household still need its setup? */
export function needsHouseholdSetup(household: { setupCompletedAt: string | null } | null | undefined): boolean {
  return !!household && !household.setupCompletedAt;
}

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

// ---------------------------------------------------------------------------
// Answer options — ported verbatim from lib/screens/onboarding/*/screen.dart
// ---------------------------------------------------------------------------

export const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say', 'Prefer to self describe'] as const;
export const SELF_DESCRIBE_GENDER = 'Prefer to self describe';

export const DIET_OPTIONS = ['Omnivore', 'Pescatarian', 'Vegetarian', 'Vegan', 'Raw', 'Other'] as const;
export type DietOption = (typeof DIET_OPTIONS)[number];

export const ALLERGEN_OPTIONS = [
  'Dairy (Lactose)', 'Gluten', 'Peanuts', 'Tree Nuts', 'Soy',
  'Sesame', 'Eggs', 'Crustaceans', 'Fish', 'Other',
] as const;

export const CALORIE_SENSITIVE_OPTIONS = [
  'Yes, I always check how many calories a food product has before buying or eating',
  'No, I eat whatever I desire regardless of the calories',
] as const;

export const CHOOSY_EATER_OPTIONS = ['Yes', 'No'] as const;

export const HEALTH_GOAL_OPTIONS = [
  'To lose weight',
  'To eat healthier',
  'To get more fit',
  'To maintain weight and support my training',
  'To build more muscle',
  'To gain weight',
] as const;

/** Weekly weight change in lbs (negative = lose). Labels adapt to units — see weeklyWeightLabel. */
export const WEEKLY_WEIGHT_OPTIONS = [-2, -1.5, -1, -0.5, 0, 0.5, 1] as const;

export const SHOPPING_TENDENCY_OPTIONS = [
  'Yes, not only do I hunt for bargains, I go to multiple stores to get the best deals',
  'Yes, I hunt for the bargains',
  'No, I buy nothing but brand name products and at whichever store is most convenient',
] as const;

export const PRICE_IMPACT_OPTIONS = ['Yes', 'Sometimes', 'No'] as const;

export const DEFAULT_WEEKLY_BUDGET = 100;
export const MAX_WEEKLY_BUDGET = 500;

export const ACTIVITY_OPTIONS = [
  { title: 'Sedentary', icon: 'armchair', body: 'Most of your day is spent sitting (e.g. desk job)' },
  { title: 'Lightly Active', icon: 'footprints', body: 'Some of your day is spent standing or walking (e.g. teacher)' },
  { title: 'Moderately Active', icon: 'activity', body: 'A good part of your day is spent up and moving (e.g. food server, delivery person)' },
  { title: 'Very Active', icon: 'dumbbell', body: 'Most of your day is spent doing hard physical activity (e.g. construction worker)' },
] as const;

export const DEVICE_OPTIONS = [
  { id: 'garmin', name: 'Garmin', body: 'Sync steps, workouts and calories burned' },
  { id: 'fitbit', name: 'Fitbit', body: 'Sync activity, sleep and heart rate' },
  { id: 'apple', name: 'Apple Watch', body: 'Sync Apple Health activity data' },
] as const;
