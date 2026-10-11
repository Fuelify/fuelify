'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { filterRecipes, isCompatibleWithDiet, totalTimeMinutes, type MealType, type PlannerRecipe, type Recipe } from '@fuelify/shared';
import { useHouseholdStore, usePlanGenerationStore, useProfileStore, useRecipeStore } from '@/lib/stores';
import { usePlan } from '@/features/premium/usePlan';
import { FoodTile, Icon, Segmented, Spinner } from '@/components/ui';

export type AddMealSource = 'suggested' | 'search' | 'custom';

const SOURCES: { value: AddMealSource; label: string }[] = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'search', label: 'Search' },
  { value: 'custom', label: 'Custom' },
];

/** Shown while there's no query, so the list isn't the whole catalog */
const BROWSE_LIMIT = 25;

/**
 * Source tabs for adding a meal: personalised suggestions (Premium), the
 * recipe catalog, or a custom entry (rendered by the parent as `custom`).
 */
export function AddMealPicker({
  date,
  mealType,
  source,
  onSourceChange,
  onPick,
  custom,
}: {
  date: string;
  mealType: MealType;
  source: AddMealSource;
  onSourceChange: (s: AddMealSource) => void;
  onPick: (recipe: Pick<Recipe, 'id' | 'title' | 'description'>) => void;
  custom: React.ReactNode;
}) {
  return (
    <div className="stack">
      <Segmented options={SOURCES} value={source} onChange={onSourceChange} />
      {source === 'suggested' && <Suggestions date={date} mealType={mealType} onPick={onPick} onSearch={() => onSourceChange('search')} />}
      {source === 'search' && <CatalogSearch mealType={mealType} onPick={onPick} />}
      {source === 'custom' && custom}
    </div>
  );
}

function Suggestions({ date, mealType, onPick, onSearch }: { date: string; mealType: MealType; onPick: (r: PlannerRecipe) => void; onSearch: () => void }) {
  const { premium, plan } = usePlan();
  const suggest = usePlanGenerationStore((s) => s.suggest);
  const householdId = useHouseholdStore((s) => s.activeHouseholdId);
  const [picks, setPicks] = useState<PlannerRecipe[] | null>(null);
  // Picks already shown; "More" skips them to show the next batch
  const [shown, setShown] = useState<string[]>([]);

  const load = useCallback(
    (skip: string[]) => {
      setPicks(null);
      return suggest(date, mealType, { householdId, skip }).then((r) => {
        setPicks(r);
        setShown([...skip, ...r.map((x) => x.id)]);
      });
    },
    [suggest, date, mealType, householdId],
  );

  useEffect(() => {
    if (premium && date) load([]);
  }, [premium, date, load]);

  if (!plan) return <div className="center" style={{ padding: 24 }}><Spinner /></div>;
  if (!premium) {
    return (
      <div className="card stack-sm center" style={{ alignItems: 'center' }}>
        <span style={{ color: 'var(--primary)' }}><Icon name="sparkles" /></span>
        <div style={{ fontWeight: 700 }}>Personalised suggestions are Premium</div>
        <p className="small muted">Picks built around your diet, allergens, likes and pantry.</p>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/premium" className="btn btn-primary btn-sm">See Premium</Link>
          <button className="btn btn-secondary btn-sm" onClick={onSearch}>Search recipes</button>
        </div>
      </div>
    );
  }
  if (!picks) return <div className="center" style={{ padding: 24 }}><Spinner /></div>;

  return (
    <div className="stack-sm">
      <div className="row-between">
        <span className="small muted">Best match first, based on your diet, likes and pantry</span>
        <button className="btn btn-ghost btn-sm" onClick={() => load(shown)} aria-label="More suggestions">
          <Icon name="shuffle" size={16} /> More
        </button>
      </div>
      {picks.length === 0 ? (
        <p className="hint">No recipes fit this meal with your diet yet. Try Search or Custom.</p>
      ) : (
        <RecipeList recipes={picks} onPick={onPick} highlightFirst />
      )}
    </div>
  );
}

function CatalogSearch({ mealType, onPick }: { mealType: MealType; onPick: (r: Recipe) => void }) {
  const recipes = useRecipeStore((s) => s.recipes);
  const loadCatalog = useRecipeStore((s) => s.loadCatalog);
  const isLoading = useRecipeStore((s) => s.isLoading);
  const [query, setQuery] = useState('');
  const [anyMeal, setAnyMeal] = useState(false);
  const diet = useProfileStore((s) => s.profile?.diet);

  useEffect(() => {
    if (recipes.length === 0) loadCatalog();
  }, [recipes.length, loadCatalog]);

  const results = useMemo(() => filterRecipes(recipes, query, { mealType: anyMeal ? undefined : mealType, diet }), [recipes, query, mealType, anyMeal, diet]);
  const shown = query.trim() ? results : results.slice(0, BROWSE_LIMIT);

  return (
    <div className="stack-sm">
      <div className="search-field" style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex' }}>
          <Icon name="search" size={18} />
        </span>
        <input
          className="input"
          type="search"
          placeholder="Search by name, cuisine or ingredient"
          aria-label="Search recipes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 38 }}
        />
      </div>
      <button className="chip" aria-pressed={anyMeal} onClick={() => setAnyMeal((v) => !v)} style={{ alignSelf: 'flex-start' }}>
        Include all meal types
      </button>
      {isLoading && recipes.length === 0 ? (
        <div className="center" style={{ padding: 24 }}><Spinner /></div>
      ) : shown.length === 0 ? (
        <p className="hint">No recipes match. Try another word, or add it as a custom meal.</p>
      ) : (
        <>
          <RecipeList recipes={shown} onPick={onPick} diet={diet} />
          {shown.length < results.length && <p className="hint center">Showing {shown.length} of {results.length}. Search to narrow down.</p>}
        </>
      )}
    </div>
  );
}

type ListRecipe = Pick<Recipe, 'id' | 'title' | 'description' | 'dietType'> &
  Partial<Pick<Recipe, 'calories' | 'prepTimeMinutes' | 'cookTimeMinutes'>>;

function RecipeList<T extends ListRecipe>({ recipes, onPick, highlightFirst, diet }: { recipes: T[]; onPick: (r: T) => void; highlightFirst?: boolean; diet?: string | null }) {
  return (
    <div className="list">
      {recipes.map((r, i) => {
        const time = totalTimeMinutes({ prepTimeMinutes: r.prepTimeMinutes ?? null, cookTimeMinutes: r.cookTimeMinutes ?? null });
        const meta = [r.calories != null ? `${r.calories} kcal` : null, time > 0 ? `${time} min` : null, r.dietType].filter(Boolean).join(' · ');
        return (
          <button key={r.id} className="list-row" onClick={() => onPick(r)} aria-label={`Add ${r.title}`} style={{ gap: 12, textAlign: 'left' }}>
            <FoodTile title={r.title} size={40} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 6 }}>
                <span className="truncate" style={{ fontWeight: 600 }}>{r.title}</span>
                {highlightFirst && i === 0 && <span className="badge badge-premium" style={{ flexShrink: 0 }}>Top pick</span>}
                {diet && !isCompatibleWithDiet(r, diet) && <span className="badge badge-danger" style={{ flexShrink: 0 }}>Not {diet.toLowerCase()}</span>}
              </div>
              {meta && <div className="tiny faint truncate">{meta}</div>}
            </div>
            <span style={{ color: 'var(--primary)' }}><Icon name="plus" size={20} /></span>
          </button>
        );
      })}
    </div>
  );
}
