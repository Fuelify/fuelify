// Subscription plans. `profiles.plan` holds the tier name ('Free' by default).

export const PLAN_TIERS = ['Free', 'Premium'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

/** Unknown or missing values are treated as Free. */
export function toPlanTier(plan: string | null | undefined): PlanTier {
  return plan === 'Premium' ? 'Premium' : 'Free';
}

export function isPremium(profile: { plan?: string | null } | null | undefined): boolean {
  return toPlanTier(profile?.plan) === 'Premium';
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
