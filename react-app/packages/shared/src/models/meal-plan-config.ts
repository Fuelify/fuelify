// Settings for auto-generated meal plans, stored in `profiles.meal_plan_config`
// and edited on the Profile page.

import { MEAL_TYPES, type MealType } from './meal';

export interface MealPlanConfig {
  /** Which meals the generator fills each day */
  slots: Record<MealType, boolean>;
}

/** Three meals a day; snacks off. */
export const DEFAULT_MEAL_PLAN_CONFIG: MealPlanConfig = {
  slots: { breakfast: true, lunch: true, dinner: true, snack: false },
};

/** Typed view of profiles.meal_plan_config; missing or malformed values fall back to the default. */
export function readMealPlanConfig(profile: { mealPlanConfig?: unknown } | null | undefined): MealPlanConfig {
  const raw = profile?.mealPlanConfig;
  const rawSlots = typeof raw === 'object' && raw !== null ? (raw as { slots?: unknown }).slots : undefined;
  const slots = { ...DEFAULT_MEAL_PLAN_CONFIG.slots };
  if (typeof rawSlots === 'object' && rawSlots !== null) {
    for (const t of MEAL_TYPES) {
      const v = (rawSlots as Record<string, unknown>)[t.value];
      if (typeof v === 'boolean') slots[t.value] = v;
    }
  }
  return { slots };
}

/** Enabled meal types, in day order (breakfast → snack). */
export function enabledSlots(config: MealPlanConfig): MealType[] {
  return MEAL_TYPES.map((t) => t.value).filter((t) => config.slots[t]);
}
