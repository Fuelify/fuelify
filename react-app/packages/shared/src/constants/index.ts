// Ported from: lib/constants.dart

// Debug settings
export const DEBUG = false; // true skips the login redirect on mobile (dev only)
export const DEBUG_ENTER_ROUTE = 'plan'; // enter route following splash screen

// Brand colours live in ./brand (BRAND_COLORS); the old Flutter COLORS were retired.

// Unit options
export const UNIT_OPTIONS = ['Imperial', 'Metric'] as const;
export type UnitOption = (typeof UNIT_OPTIONS)[number];

export function getIndexOfUnitOption(selectedOption: string): number {
  const index = UNIT_OPTIONS.indexOf(selectedOption as UnitOption);
  return index >= 0 ? index : 0;
}

// Route constants — mirrors Routes, DashboardRoutes, OnboardingRoutes from router.dart
export const ROUTES = {
  splash: '/',
  login: '/login',
  registration: '/registration',
} as const;

export const DASHBOARD_ROUTES = ['home', 'plan', 'discovery', 'food', 'cart', 'pantry', 'profile'] as const;
export const DEFAULT_DASHBOARD_ROUTE_INDEX = 1;

export const ONBOARDING_ROUTES = [
  'onboarding/welcome',
  'onboarding/profile',
  'onboarding/personal-details',
  'onboarding/diet',
  'onboarding/allergens',
  'onboarding/eating-habits',
  'onboarding/health-goals',
  'onboarding/primary-goal',
  'onboarding/weight-goals',
  'onboarding/shopping-preferences',
  'onboarding/activity-level',
  'onboarding/device-connections',
  'onboarding/submission',
] as const;
export * from './brand';
