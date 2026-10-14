'use client';

import { useEffect } from 'react';
import { zipRegion } from '@fuelify/shared';
import { useHouseholdStore, usePriceBookStore } from '@/lib/stores';

/** Keeps the price book loaded for the active household; returns its id and region. */
export function usePriceBook() {
  const household = useHouseholdStore((s) => s.households.find((h) => h.id === s.activeHouseholdId));
  const load = usePriceBookStore((s) => s.load);
  const loadedFor = usePriceBookStore((s) => s.householdId);
  const region = zipRegion(household?.postcode);
  useEffect(() => {
    if (household && loadedFor !== household.id) load(household.id, region);
  }, [household?.id, loadedFor, region, load]); // eslint-disable-line react-hooks/exhaustive-deps
  return { householdId: household?.id ?? null, region, ready: !!household && loadedFor === household.id };
}
