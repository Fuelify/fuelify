'use client';

import { useEffect, useState } from 'react';
import { MEAL_TYPES, type MealPlanMeal, type MealType } from '@fuelify/shared';
import { useMealPlanStore } from '@/lib/stores';
import { usePlan } from '@/features/premium/usePlan';
import { AddMealPicker, type AddMealSource } from './AddMealPicker';
import { Segmented, Sheet } from '@/components/ui';

// Re-exported so feature code can import meal types alongside the sheet
export { MEAL_TYPES, type MealType };

/**
 * Add or edit a planned meal. Pass `meal` to edit, or `preset` to add. Adding
 * offers suggestions, catalog search or a custom entry; a preset title (e.g.
 * from a recipe) goes straight to the custom form.
 */
export function MealSheet({
  open,
  onClose,
  meal,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  meal?: MealPlanMeal | null;
  preset?: { date: string; mealType?: MealType; title?: string; description?: string; recipeId?: string };
}) {
  const addMeal = useMealPlanStore((s) => s.addMeal);
  const updateMeal = useMealPlanStore((s) => s.updateMeal);
  const moveMeal = useMealPlanStore((s) => s.moveMeal);
  const deleteMeal = useMealPlanStore((s) => s.deleteMeal);
  const setSelectedDate = useMealPlanStore((s) => s.setSelectedDate);
  const storeError = useMealPlanStore((s) => s.error);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<AddMealSource>('custom');
  const { premium } = usePlan();
  const picking = !meal && source !== 'custom';

  // Reset the form only when the sheet opens — `preset` is a fresh object on
  // every parent render, so depending on it would wipe what the user typed.
  useEffect(() => {
    if (!open) return;
    setTitle(meal?.title ?? preset?.title ?? '');
    setDescription(meal?.description ?? preset?.description ?? '');
    setMealType(((meal?.mealType ?? preset?.mealType) as MealType) ?? 'dinner');
    setDate(meal?.date ?? preset?.date ?? '');
    setSource(meal || preset?.title ? 'custom' : premium ? 'suggested' : 'search');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    if (!title.trim() || !date) return;
    setBusy(true);
    if (meal) {
      // moveMeal/updateMeal refresh the store's selected day, so point it at the meal's day first
      setSelectedDate(meal.date);
      await updateMeal(meal.id, { title: title.trim(), description: description.trim(), mealType });
      if (date !== meal.date) await moveMeal(meal.id, date);
    } else {
      await addMeal({ title: title.trim(), description: description.trim(), date, mealType, recipeId: preset?.recipeId });
    }
    setBusy(false);
    onClose();
  };

  /** Picking a recipe adds it straight to the plan */
  const handlePick = async (recipe: { id: string; title: string; description: string }) => {
    if (!date) return;
    setBusy(true);
    await addMeal({ title: recipe.title, description: recipe.description, date, mealType, recipeId: recipe.id });
    setBusy(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!meal) return;
    setBusy(true);
    setSelectedDate(meal.date);
    await deleteMeal(meal.id);
    setBusy(false);
    onClose();
  };

  const customFields = (
    <>
      <div className="field">
        <label htmlFor="meal-title">Meal</label>
        <input id="meal-title" className="input" placeholder="e.g. Greek chicken bowls" value={title}
          onChange={(e) => setTitle(e.target.value)} autoFocus={!meal && !preset?.title} />
      </div>
      <div className="field">
        <label htmlFor="meal-notes">Notes</label>
        <textarea id="meal-notes" className="textarea" placeholder="Optional — ingredients, prep notes…" value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </div>
    </>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={meal ? 'Edit meal' : 'Add meal'}
      footer={
        picking ? undefined : <>
          {meal && (
            <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>Delete</button>
          )}
          <button className="btn btn-primary grow" onClick={handleSave} disabled={busy || !title.trim() || !date}>
            {busy ? 'Saving…' : meal ? 'Save changes' : 'Add to plan'}
          </button>
        </>
      }
    >
      <div className="stack">
        {storeError && <div className="alert">{storeError}</div>}
        <div className="field">
          <span className="label">Type</span>
          <Segmented options={MEAL_TYPES.map((t) => ({ value: t.value, label: t.label }))} value={mealType} onChange={setMealType} />
        </div>
        <div className="field">
          <label htmlFor="meal-date">Date</label>
          <input id="meal-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {meal ? (
          customFields
        ) : (
          <AddMealPicker date={date} mealType={mealType} source={source} onSourceChange={setSource} onPick={handlePick} custom={customFields} />
        )}
      </div>
    </Sheet>
  );
}
