// Web-only image assets for onboarding options (the options themselves live in @fuelify/shared).
import type { DietOption } from '@fuelify/shared';

export const DIET_IMAGES: Partial<Record<DietOption, string>> = {
  Omnivore: '/onboarding/diet/omnivore.jpg',
  Pescatarian: '/onboarding/diet/pescatarian.jpg',
  Vegetarian: '/onboarding/diet/vegetarian.jpg',
  Vegan: '/onboarding/diet/vegan.jpg',
  Raw: '/onboarding/diet/raw.jpg',
};

export const DEVICE_IMAGES: Record<string, string> = {
  garmin: '/onboarding/devices/garmin.jpg',
  fitbit: '/onboarding/devices/fitbit.jpg',
  apple: '/onboarding/devices/apple.jpg',
};

export const WELCOME_ANIMATION = '/onboarding/welcome.gif';
