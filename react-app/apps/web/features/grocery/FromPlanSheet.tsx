'use client';

import { useEffect } from 'react';
import { addDays, formatAmounts, todayISO } from '@fuelify/shared';
import { useGroceryStore } from '@/lib/stores';
import { Sheet, Spinner } from '@/components/ui';

const DAYS = 7;

/** Preview the next week's ingredients (minus pantry and cart) and add them to the cart. */
export function FromPlanSheet({ open, onClose, householdId, onAdded }: { open: boolean; onClose: () => void; householdId: string; onAdded: (n: number) => void }) {
  const preview = useGroceryStore((s) => s.preview);
  const busy = useGroceryStore((s) => s.busy);
  const error = useGroceryStore((s) => s.error);
  const previewFromPlan = useGroceryStore((s) => s.previewFromPlan);
  const addPreviewToCart = useGroceryStore((s) => s.addPreviewToCart);

  useEffect(() => {
    if (open) previewFromPlan(Array.from({ length: DAYS }, (_, i) => addDays(todayISO(), i)), householdId);
  }, [open, householdId, previewFromPlan]);

  const byCategory = new Map<string, NonNullable<typeof preview>['needs']>();
  for (const n of preview?.needs ?? []) byCategory.set(n.category, [...(byCategory.get(n.category) ?? []), n]);

  const add = async () => {
    const n = await addPreviewToCart(householdId);
    onAdded(n);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="From your meal plan"
      footer={
        preview && preview.needs.length > 0 ? (
          <button className="btn btn-primary btn-block" onClick={add} disabled={busy === 'adding'}>
            {busy === 'adding' ? 'Adding…' : `Add ${preview.needs.length} item${preview.needs.length === 1 ? '' : 's'} to cart`}
          </button>
        ) : undefined
      }
    >
      {busy === 'preview' || !preview ? (
        error ? <div className="alert" role="alert">{error}</div> : <div className="center" style={{ padding: 32 }}><Spinner /></div>
      ) : (
        <div className="stack">
          <p className="small muted">Everything your planned meals need for the next {DAYS} days.</p>
          {preview.needs.length === 0 ? (
            <p className="hint">Nothing to add. {preview.mealsWithoutRecipe ? 'Meals you typed in yourself have no ingredient list.' : 'Plan some meals first, or everything is already covered.'}</p>
          ) : (
            [...byCategory.entries()].map(([category, needs]) => (
              <section key={category} className="stack-sm">
                <div className="section-title" style={{ margin: 0 }}><span>{category}</span></div>
                <div className="list">
                  {needs.map((n) => (
                    <div key={n.key} className="list-row" style={{ alignItems: 'flex-start', minHeight: 48 }}>
                      <span className="grow">
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{n.name}</span>
                        <span className="tiny faint" style={{ display: 'block' }}>{n.recipes.join(', ')}</span>
                      </span>
                      <span className="small muted">{formatAmounts(n.amounts)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
          {preview.inPantry.length > 0 && <p className="hint">Already in your pantry: {preview.inPantry.join(', ')}.</p>}
          {preview.alreadyInCart.length > 0 && <p className="hint">Already on your list: {preview.alreadyInCart.join(', ')}.</p>}
          {preview.mealsWithoutRecipe > 0 && preview.needs.length > 0 && (
            <p className="hint">{preview.mealsWithoutRecipe} meal{preview.mealsWithoutRecipe === 1 ? '' : 's'} you typed in yourself aren’t included.</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
