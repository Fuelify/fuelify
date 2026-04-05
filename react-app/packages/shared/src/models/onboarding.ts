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
  'shopping-preferences',
  'activity-level',
  'device-connections',
  'submission',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;
