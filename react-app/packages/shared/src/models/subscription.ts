// Subscription plans. The plan belongs to the household (`households.plan`),
// so every member shares it; only the owner can change it.

export const PLAN_TIERS = ['standard', 'premium'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PLAN_LABELS: Record<PlanTier, string> = { standard: 'Standard', premium: 'Premium' };

/** Unknown or missing values are treated as standard. */
export function toPlanTier(plan: string | null | undefined): PlanTier {
  return plan === 'premium' ? 'premium' : 'standard';
}

export function isPremium(household: { plan?: string | null } | null | undefined): boolean {
  return toPlanTier(household?.plan) === 'premium';
}

export interface PremiumFeature {
  id: string;
  title: string;
  body: string;
  /** Lead feature, shown in upgrade banners */
  highlight?: boolean;
}

export const PREMIUM_FEATURES: readonly PremiumFeature[] = [
  {
    id: 'auto-weekly-plans',
    title: 'Auto-generated weekly meal plans',
    body: 'A full week of breakfasts, lunches and dinners built around your goals, diet, allergens and budget, refreshed every week.',
    highlight: true,
  },
  {
    id: 'pantry-aware',
    title: 'Plans that use your pantry first',
    body: 'Meals are chosen to use up what you already have, starting with opened items, so less food goes to waste.',
  },
  {
    id: 'auto-shopping-list',
    title: 'One-tap shopping list',
    body: "Everything the week's plan needs that isn't in your pantry goes straight into the household cart.",
  },
  {
    id: 'unlimited-ideas',
    title: 'Unlimited AI meal ideas',
    body: 'Ask for new ideas whenever you like, for any meal or diet.',
  },
];

export const HIGHLIGHTED_PREMIUM_FEATURE = PREMIUM_FEATURES.find((f) => f.highlight) ?? PREMIUM_FEATURES[0];

/** Promo ids used for dismissible upgrade prompts. */
export const UPGRADE_PROMO_ID = 'premium-weekly-plans';
/** How long a dismissed upgrade prompt stays hidden. */
export const UPGRADE_PROMO_SNOOZE_DAYS = 7;
