// Typed views over the JSONB columns of `profiles` that hold onboarding answers.
// The columns are untyped in the database; these readers give the apps a
// single, typed shape and tolerate missing or malformed values.

export interface EatingHabits {
  calorieSensitive?: string;
  choosyEater?: string;
}

/** profiles.goals */
export interface ProfileGoals {
  all?: string[];
  primary?: string;
  /** kg */
  targetWeight?: number | null;
  /** lbs per week, negative = lose */
  weekly?: number;
  habits?: EatingHabits;
}

/** profiles.shopping */
export interface ShoppingPreferences {
  tendency?: string;
  priceSensitivity?: string;
  /** USD per week */
  budget?: number;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function readGoals(profile: { goals?: unknown } | null | undefined): ProfileGoals {
  const g: Record<string, unknown> = isObject(profile?.goals) ? profile.goals : {};
  return {
    all: Array.isArray(g.all) ? (g.all as unknown[]).filter((x): x is string => typeof x === 'string') : undefined,
    primary: typeof g.primary === 'string' ? g.primary : undefined,
    targetWeight: typeof g.targetWeight === 'number' ? g.targetWeight : undefined,
    weekly: typeof g.weekly === 'number' ? g.weekly : undefined,
    habits: isObject(g.habits) ? (g.habits as EatingHabits) : undefined,
  };
}

export function readShopping(profile: { shopping?: unknown } | null | undefined): ShoppingPreferences {
  const s: Record<string, unknown> = isObject(profile?.shopping) ? profile.shopping : {};
  return {
    tendency: typeof s.tendency === 'string' ? s.tendency : undefined,
    priceSensitivity: typeof s.priceSensitivity === 'string' ? s.priceSensitivity : undefined,
    budget: typeof s.budget === 'number' ? s.budget : undefined,
  };
}
