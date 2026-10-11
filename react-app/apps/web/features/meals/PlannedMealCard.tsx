'use client';

import type { MealPlanMeal } from '@fuelify/shared';
import { useHouseholdStore, usePlanGenerationStore } from '@/lib/stores';
import { FoodTile, Icon } from '@/components/ui';
import { useRecipeImage } from '@/features/recipes/useRecipeImage';

/**
 * A meal on the Plan page. Generated meals get a shuffle button: it swaps to the
 * next-best saved option instantly, and on the last one plans a fresh batch.
 */
export function PlannedMealCard({ meal, onOpen }: { meal: MealPlanMeal; onOpen: () => void }) {
  const shuffle = usePlanGenerationStore((s) => s.shuffle);
  const busy = usePlanGenerationStore((s) => s.shufflingMealIds.includes(meal.id));
  const householdId = useHouseholdStore((s) => s.activeHouseholdId);
  const swappable = meal.generated && !!meal.recipeId;
  const imageUrl = useRecipeImage(meal.recipeId);

  return (
    <div className="card row" style={{ gap: 4, padding: 0 }}>
      <button className="card-button row grow" style={{ gap: 12, padding: 14, minWidth: 0, background: 'transparent', borderRadius: 'var(--radius)' }} onClick={onOpen}>
        <FoodTile title={meal.title} imageUrl={imageUrl} size={48} />
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
          title={meal.alternatives.length ? `${meal.alternatives.length} more option${meal.alternatives.length === 1 ? '' : 's'}` : 'Find new options'}
          disabled={busy}
          onClick={() => shuffle(meal.id, householdId)}
        >
          <span className={busy ? 'spin' : undefined} style={{ display: 'inline-flex' }}><Icon name="shuffle" size={18} /></span>
        </button>
      )}
    </div>
  );
}
