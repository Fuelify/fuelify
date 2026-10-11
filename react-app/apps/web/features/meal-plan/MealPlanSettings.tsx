'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MEAL_TYPES, readMealPlanConfig, type MealPlanConfig, type MealType } from '@fuelify/shared';
import { useProfileStore } from '@/lib/stores';
import { usePlan } from '@/features/premium/usePlan';

/** Profile card for the meal plan generator's settings (profiles.meal_plan_config). */
export function MealPlanSettings() {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const { premium } = usePlan();
  const [error, setError] = useState<string | null>(null);

  const config = readMealPlanConfig(profile);

  const toggle = async (type: MealType) => {
    const next: MealPlanConfig = { slots: { ...config.slots, [type]: !config.slots[type] } };
    if (!Object.values(next.slots).some(Boolean)) {
      setError('Keep at least one meal turned on.');
      return;
    }
    setError(null);
    if (!(await updateProfile({ mealPlanConfig: { ...next } }))) setError('Could not save. Try again.');
  };

  return (
    <div className="card stack-sm">
      <span className="label">Meals to plan each day</span>
      <div className="chips" role="group" aria-label="Meals to plan each day">
        {MEAL_TYPES.map((t) => (
          <button key={t.value} className="chip" aria-pressed={config.slots[t.value]} disabled={!profile} onClick={() => toggle(t.value)}>
            {t.emoji} {t.value === 'snack' ? 'Snacks' : t.label}
          </button>
        ))}
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      <p className="hint">
        {premium ? (
          <>Use <strong>Generate</strong> on the Plan page to fill these from recipes that match your diet and allergens.</>
        ) : (
          <>Auto-generated plans are a <Link href="/premium" style={{ color: 'var(--primary)', fontWeight: 600 }}>Premium</Link> feature.</>
        )}
      </p>
    </div>
  );
}
