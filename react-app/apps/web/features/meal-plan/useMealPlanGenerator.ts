'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MEAL_TYPES, formatLong, fromISODate, todayISO } from '@fuelify/shared';
import { useHouseholdStore, usePlanGenerationStore } from '@/lib/stores';
import { usePlan } from '@/features/premium/usePlan';

/**
 * Plan-page access to the Premium meal plan generator. Standard households are
 * sent to the Premium page instead. Past days are never regenerated.
 */
export function useMealPlanGenerator() {
  const router = useRouter();
  const { premium } = usePlan();
  const householdId = useHouseholdStore((s) => s.activeHouseholdId);
  const generatingDates = usePlanGenerationStore((s) => s.generatingDates);
  const error = usePlanGenerationStore((s) => s.error);
  const lastResult = usePlanGenerationStore((s) => s.lastResult);
  const generate = usePlanGenerationStore((s) => s.generate);
  const clearResult = usePlanGenerationStore((s) => s.clearResult);
  const clearGenerated = usePlanGenerationStore((s) => s.clearGenerated);

  const run = useCallback(
    (dates: string[]) => {
      if (!premium) {
        router.push('/premium');
        return;
      }
      const today = todayISO();
      const upcoming = dates.filter((d) => d >= today);
      if (upcoming.length) generate(upcoming, householdId);
    },
    [premium, router, generate, householdId],
  );

  return {
    premium,
    generateDays: run,
    clearDays: clearGenerated,
    isGenerating: (date?: string) => (date ? generatingDates.includes(date) : generatingDates.length > 0),
    error,
    message: lastResult ? resultMessage(lastResult) : null,
    clearResult,
  };
}

function resultMessage(r: { dates: string[]; added: number; unfilled: { mealType: string }[]; cleared?: number }): string {
  const span = r.dates.length === 1 ? formatLong(r.dates[0]) : `${formatShort(r.dates[0])} – ${formatShort(r.dates[r.dates.length - 1])}`;
  if (r.cleared !== undefined) return `Cleared ${r.cleared} generated meal${r.cleared === 1 ? '' : 's'} for ${span}.`;
  let msg = r.added === 0 ? `Nothing new to plan for ${span}.` : `Planned ${r.added} meal${r.added === 1 ? '' : 's'} for ${span}.`;
  if (r.unfilled.length) {
    const types = [...new Set(r.unfilled.map((u) => MEAL_TYPES.find((t) => t.value === u.mealType)?.label.toLowerCase() ?? u.mealType))];
    msg += ` No recipes fit your diet for ${types.join(' and ')} yet.`;
  }
  return msg;
}

const formatShort = (iso: string) => fromISODate(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
