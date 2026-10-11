'use client';

// Requests AI-generated meal ideas from the user's pantry and shows them as
// expandable cards. Prioritizes partially-opened items. Ideas can be added to
// the plan, and their missing ingredients to the cart.

import { type MealSuggestion, type PantryItem, todayISO, toMealType } from '@fuelify/shared';
import { useCallback, useState } from 'react';
import { useHouseholdStore, useMealSuggestionStore, useShoppingCartStore } from '@/lib/stores';
import { FoodTile, Icon, Sheet, Spinner } from '@/components/ui';
import { MealSheet } from '@/features/meals/MealSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  pantryItems: PantryItem[];
}

const MEAL_TYPES = ['Any', 'Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

export function MealIdeasSheet({ open, onClose, pantryItems }: Props) {
  const suggestions = useMealSuggestionStore((s) => s.suggestions);
  const prioritizedItems = useMealSuggestionStore((s) => s.prioritizedItems);
  const isGenerating = useMealSuggestionStore((s) => s.isGenerating);
  const error = useMealSuggestionStore((s) => s.error);
  const generatedAt = useMealSuggestionStore((s) => s.generatedAt);
  const generate = useMealSuggestionStore((s) => s.generate);

  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>('Any');
  const [dietary, setDietary] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [planning, setPlanning] = useState<MealSuggestion | null>(null);

  const openItemCount = pantryItems.filter((i) => i.status === 'open' && i.remainingPct < 100).length;

  const handleGenerate = useCallback(async () => {
    setExpanded(null);
    await generate(pantryItems, {
      mealType: mealType === 'Any' ? undefined : mealType.toLowerCase(),
      dietary: dietary.trim() || undefined,
      count: 3,
    });
  }, [generate, pantryItems, mealType, dietary]);

  const hasContent = suggestions.length > 0 && !isGenerating;

  return (
    <>
      <Sheet
        open={open && !planning}
        onClose={onClose}
        title="Meal ideas"
        footer={
          <button className="btn btn-primary btn-block" onClick={handleGenerate} disabled={isGenerating || pantryItems.length === 0}>
            <Icon name="sparkles" />
            {isGenerating ? 'Thinking…' : hasContent ? 'Regenerate' : 'Suggest meals'}
          </button>
        }
      >
        <div className="stack">
          <p className="small muted">
            Uses your {pantryItems.length} pantry item{pantryItems.length === 1 ? '' : 's'}
            {openItemCount > 0 ? `, prioritizing ${openItemCount} opened` : ''}.
          </p>

          <div className="chips-scroll">
            {MEAL_TYPES.map((m) => (
              <button key={m} className="chip" aria-pressed={mealType === m} onClick={() => setMealType(m)}>{m}</button>
            ))}
          </div>
          <input className="input" placeholder="Dietary needs (optional) — e.g. vegetarian" value={dietary}
            onChange={(e) => setDietary(e.target.value)} aria-label="Dietary needs" />

          {pantryItems.length === 0 && <div className="alert alert-info">Add items to your pantry to get suggestions.</div>}
          {error && <div className="alert">{error}</div>}

          {isGenerating && (
            <div className="center-fill" style={{ minHeight: 160 }}>
              <Spinner />
              <p className="muted small">Cooking up ideas from your pantry…</p>
            </div>
          )}

          {hasContent && prioritizedItems.length > 0 && (
            <div className="alert alert-info small">
              <strong>Using up first:</strong> {prioritizedItems.join(' · ')}
            </div>
          )}

          {!isGenerating && suggestions.map((sug, idx) => (
            <SuggestionCard
              key={idx}
              suggestion={sug}
              expanded={expanded === idx}
              onToggle={() => setExpanded(expanded === idx ? null : idx)}
              onPlan={() => setPlanning(sug)}
            />
          ))}

          {!isGenerating && suggestions.length === 0 && !error && pantryItems.length > 0 && (
            <p className="muted small center" style={{ padding: '16px 0' }}>
              Tap “Suggest meals” for recipe ideas that use what you already have.
            </p>
          )}

          {generatedAt && hasContent && (
            <p className="tiny faint center">Generated {new Date(generatedAt).toLocaleTimeString()}</p>
          )}
        </div>
      </Sheet>

      <MealSheet
        open={!!planning}
        onClose={() => setPlanning(null)}
        preset={planning ? {
          date: todayISO(),
          title: planning.title,
          description: planning.description,
          mealType: toMealType(planning.mealType),
        } : undefined}
      />
    </>
  );
}

function SuggestionCard({
  suggestion,
  expanded,
  onToggle,
  onPlan,
}: {
  suggestion: MealSuggestion;
  expanded: boolean;
  onToggle: () => void;
  onPlan: () => void;
}) {
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const addCartItem = useShoppingCartStore((s) => s.addItem);
  const [cartState, setCartState] = useState<'idle' | 'adding' | 'added'>('idle');

  const pantryIngredients = suggestion.ingredients.filter((i) => !i.missing);
  const missingIngredients = suggestion.ingredients.filter((i) => i.missing);
  const openIngredients = suggestion.ingredients.filter((i) => i.usesOpenItem);

  const addMissingToCart = async () => {
    setCartState('adding');
    const householdId = await ensureHousehold();
    if (householdId) {
      for (const ing of missingIngredients) {
        await addCartItem(householdId, { name: ing.name, notes: ing.amount || undefined });
      }
    }
    setCartState('added');
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button className="row" onClick={onToggle} style={{ width: '100%', padding: 14, gap: 12, alignItems: 'flex-start', textAlign: 'left' }}>
        <FoodTile title={suggestion.title} />
        <div className="grow stack-sm" style={{ gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{suggestion.title}</div>
          <div className="small muted">{suggestion.description}</div>
          <div className="chips" style={{ gap: 6 }}>
            {suggestion.mealType && <span className="badge">{suggestion.mealType}</span>}
            {suggestion.estimatedTime && <span className="badge"><Icon name="clock" size={12} />&nbsp;{suggestion.estimatedTime}</span>}
            {typeof suggestion.servings === 'number' && <span className="badge">Serves {suggestion.servings}</span>}
            <span className="badge badge-accent">Use-it-up {suggestion.useItUpScore}</span>
          </div>
          {openIngredients.length > 0 && (
            <div className="tiny" style={{ color: 'var(--accent)' }}>
              Uses opened: {openIngredients.map((i) => i.name).join(', ')}
            </div>
          )}
        </div>
        <span className="faint" style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
          <Icon name="chevronDown" size={20} />
        </span>
      </button>

      {expanded && (
        <div className="stack" style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="stack-sm">
            <span className="label">From your pantry</span>
            {pantryIngredients.length === 0 ? <span className="small faint">—</span> : pantryIngredients.map((ing, i) => (
              <div key={i} className="small">• {ing.name}{ing.amount ? ` — ${ing.amount}` : ''}</div>
            ))}
          </div>
          {missingIngredients.length > 0 && (
            <div className="stack-sm">
              <span className="label">You&apos;ll need</span>
              {missingIngredients.map((ing, i) => (
                <div key={i} className="small" style={{ color: 'var(--primary)' }}>• {ing.name}{ing.amount ? ` — ${ing.amount}` : ''}</div>
              ))}
            </div>
          )}
          <div className="stack-sm">
            <span className="label">Steps</span>
            {suggestion.steps.map((step, i) => (
              <div key={i} className="row small" style={{ alignItems: 'flex-start', gap: 10 }}>
                <span className="badge badge-primary" style={{ flexShrink: 0, width: 22, padding: 0, justifyContent: 'center' }}>{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          {suggestion.notes && <div className="alert alert-info small row" style={{ gap: 8, alignItems: 'flex-start' }}><Icon name="lightbulb" size={16} /> <span>{suggestion.notes}</span></div>}
          <div className="row">
            {missingIngredients.length > 0 && (
              <button className="btn btn-secondary btn-sm grow" onClick={addMissingToCart} disabled={cartState !== 'idle'}>
                <Icon name={cartState === 'added' ? 'check' : 'cart'} />
                {cartState === 'added' ? 'Added' : cartState === 'adding' ? 'Adding…' : 'Add missing to cart'}
              </button>
            )}
            <button className="btn btn-primary btn-sm grow" onClick={onPlan}>
              <Icon name="calendar" /> Add to plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
