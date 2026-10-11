'use client';

import type { MealPlanMeal } from '@fuelify/shared';
import { useMealPlanStore } from '@/lib/stores';
import { FoodTile, Icon } from '@/components/ui';

/**
 * A meal on the Plan page. Generated meals with saved options get a shuffle
 * button that swaps to the next-best recipe instantly (no regenerate).
 */
export function PlannedMealCard({ meal, onOpen }: { meal: MealPlanMeal; onOpen: () => void }) {
  const swapMeal = useMealPlanStore((s) => s.swapMeal);
  const swappable = meal.generated && meal.alternatives.length > 0;

  return (
    <div className="card row" style={{ gap: 4, padding: 0 }}>
      <button className="card-button row grow" style={{ gap: 12, padding: 14, minWidth: 0, background: 'transparent', borderRadius: 'var(--radius)' }} onClick={onOpen}>
        <FoodTile title={meal.title} size={48} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="truncate" style={{ fontWeight: 700 }}>{meal.title}</span>
            {meal.generated && <span className="badge badge-tertiary" style={{ flexShrink: 0 }}>Auto</span>}
          </div>
          {meal.description && <div className="small muted truncate">{meal.description}</div>}
        </div>
        {!swappable && <span className="faint"><Icon name="chevronRight" size={18} /></span>}
      </button>
      {swappable && (
        <button
          className="icon-btn icon-btn-filled"
          style={{ marginRight: 12, flexShrink: 0 }}
          aria-label={`Swap ${meal.title} for another option`}
          title={`Swap (${meal.alternatives.length + 1} options)`}
          onClick={() => swapMeal(meal.id)}
        >
          <Icon name="shuffle" size={18} />
        </button>
      )}
    </div>
  );
}
