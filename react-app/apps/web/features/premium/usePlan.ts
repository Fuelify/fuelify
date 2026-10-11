'use client';

import { useCallback, useEffect, useState } from 'react';
import { UPGRADE_PROMO_ID, isOwner, isPremium, selectActiveHousehold, toPlanTier, type PlanTier } from '@fuelify/shared';
import { useAuthStore, useHouseholdStore, usePreferencesStore } from '@/lib/stores';

/**
 * The active household's plan and the owner-only switch between Standard and
 * Premium. Downgrading also clears any "Not now" on the upgrade banner so it
 * shows again straight away.
 */
export function usePlan() {
  const household = useHouseholdStore(selectActiveHousehold);
  const members = useHouseholdStore((s) => s.members);
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const setHouseholdPlan = useHouseholdStore((s) => s.setPlan);
  const userId = useAuthStore((s) => s.userId);
  const undismiss = usePreferencesStore((s) => s.undismiss);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!household) ensureHousehold();
  }, [household, ensureHousehold]);

  const setPlan = useCallback(
    async (plan: PlanTier) => {
      setBusy(true);
      setError(null);
      const err = await setHouseholdPlan(plan);
      if (!err && plan === 'standard') undismiss(UPGRADE_PROMO_ID);
      setError(err);
      setBusy(false);
      return !err;
    },
    [setHouseholdPlan, undismiss],
  );

  return {
    household,
    /** Undefined until the household has loaded */
    plan: household ? toPlanTier(household.plan) : undefined,
    premium: isPremium(household),
    canChange: isOwner(members, userId),
    setPlan,
    busy,
    error,
  };
}
