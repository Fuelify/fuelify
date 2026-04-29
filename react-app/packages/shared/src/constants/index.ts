// Ported from: lib/constants.dart

// Debug settings
export const DEBUG = true;
export const DEBUG_ENTER_ROUTE = 'plan'; // enter route following splash screen

// Theme colors (hex values from Flutter Color objects)
export const COLORS = {
  background: '#202020',     // kBackgroundColor - Color(0xFF202020)
  primary: '#FFBD73',        // kPrimaryColor - Color(0xFFFFBD73)
  primaryTheme: '#9E9E9E',   // primaryThemeColor - Colors.grey
  selected: '#4DB6AC',       // selectedColor - Colors.teal.shade300
  unselected: '#FFFFFF',     // unselectedColor - Colors.white
} as const;

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
