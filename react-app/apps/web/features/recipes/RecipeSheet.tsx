'use client';

import { useState } from 'react';
import { NUTRIENTS, applySwaps, formatMinutes, type IngredientSwap, type Recipe, type SuggestionMeta, todayISO, totalTimeMinutes } from '@fuelify/shared';
import { useHouseholdStore, useRecipeStore, useShoppingCartStore } from '@/lib/stores';
import { FoodImage, Icon, Sheet } from '@/components/ui';
import { MealSheet } from '@/features/meals/MealSheet';
import { SwapOptions } from '@/features/grocery/SwapOptions';

/**
 * Recipe detail: ingredients, steps, nutrition, like/favorite, add ingredients
 * to cart, and a primary action (default: add to plan; the Plan page passes
 * "Edit meal" for a meal that's already planned).
 */
export function RecipeSheet({
  recipe,
  onClose,
  primaryAction,
  swaps = [],
  onSwap,
}: {
  recipe: Recipe | null;
  onClose: () => void;
  primaryAction?: { label: string; icon: 'edit' | 'calendar'; onClick: () => void };
  /** A planned meal's swaps; with `onSwap`, ingredients can be tapped to swap */
  swaps?: IngredientSwap[];
  /** Swap one of the recipe's lines (replacement name, or null to undo) */
  onSwap?: (original: string, replacementName: string | null, meta?: SuggestionMeta) => Promise<void> | void;
}) {
  const classifications = useRecipeStore((s) => s.classifications);
  const classifyRecipe = useRecipeStore((s) => s.classifyRecipe);
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const addCartItem = useShoppingCartStore((s) => s.addItem);

  const [planOpen, setPlanOpen] = useState(false);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [swapBusy, setSwapBusy] = useState(false);
  const shown = recipe ? applySwaps(recipe.ingredients, swaps) : [];
  const doSwap = async (original: string, name: string | null, meta?: SuggestionMeta) => {
    if (!onSwap) return;
    setSwapBusy(true);
    await onSwap(original, name, meta);
    setSwapBusy(false);
    setSwapping(null);
  };
  const [cartState, setCartState] = useState<'idle' | 'adding' | 'added'>('idle');

  const current = recipe ? classifications.find((c) => c.recipeId === recipe.id)?.classification : undefined;

  const addIngredientsToCart = async () => {
    if (!recipe) return;
    setCartState('adding');
    const householdId = await ensureHousehold();
    if (householdId) {
      for (const ingredient of recipe.ingredients) {
        await addCartItem(householdId, { name: ingredient, recipeId: recipe.id });
      }
    }
    setCartState('added');
  };

  const close = () => { setCartState('idle'); onClose(); };

  return (
    <>
      <Sheet
        open={!!recipe && !planOpen && swapping === null}
        onClose={close}
        title={recipe?.title ?? ''}
        footer={
          <>
            <button className="btn btn-secondary grow" onClick={addIngredientsToCart} disabled={cartState !== 'idle'}>
              <Icon name={cartState === 'added' ? 'check' : 'cart'} />
              {cartState === 'added' ? 'Added to cart' : cartState === 'adding' ? 'Adding…' : 'Add to cart'}
            </button>
            {primaryAction ? (
              <button className="btn btn-primary grow" onClick={primaryAction.onClick}>
                <Icon name={primaryAction.icon} /> {primaryAction.label}
              </button>
            ) : (
              <button className="btn btn-primary grow" onClick={() => setPlanOpen(true)}>
                <Icon name="calendar" /> Add to plan
              </button>
            )}
          </>
        }
      >
        {recipe && (
          <div className="stack-lg">
            <FoodImage title={recipe.title} imageUrl={recipe.imageUrl} iconSize={56} style={{ height: 180, borderRadius: 'var(--radius)' }} />
            <p className="muted">{recipe.description}</p>
            <RecipeMeta recipe={recipe} />
            {recipe.sourceUrl && (
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="small row" style={{ gap: 6, color: 'var(--primary)', fontWeight: 600 }}>
                <Icon name="link" size={16} /> View original on {new URL(recipe.sourceUrl).hostname.replace(/^www\./, '')}
              </a>
            )}

            <div className="row" style={{ gap: 8 }}>
              <ClassifyButton label="Like" icon="heart" active={current === 'liked'} onClick={() => classifyRecipe(recipe.id, 'liked')} />
              <ClassifyButton label="Favorite" icon="star" active={current === 'favorited'} onClick={() => classifyRecipe(recipe.id, 'favorited')} />
              <ClassifyButton label="Pass" icon="thumbsDown" active={current === 'disliked'} onClick={() => classifyRecipe(recipe.id, 'disliked')} />
            </div>

            {recipe.ingredients.length > 0 && (
              <section className="stack-sm">
                <h3 className="h3">Ingredients</h3>
                {onSwap && <p className="tiny faint">Tap an ingredient to swap it for this meal.</p>}
                <ul className="list" style={{ listStyle: 'none' }}>
                  {recipe.ingredients.map((original, i) => {
                    const line = shown[i];
                    const swapped = line !== original;
                    const body = (
                      <span className="grow">
                        <span style={{ display: 'block' }}>{line}</span>
                        {swapped && <span className="tiny faint">Swapped from {original}</span>}
                      </span>
                    );
                    return (
                      <li key={`${i}-${original}`} style={{ listStyle: 'none' }}>
                        {onSwap ? (
                          <button className="list-row" style={{ minHeight: 44, width: '100%', textAlign: 'left', gap: 8 }} onClick={() => setSwapping(original)}>
                            {body}
                            {swapped && <span className="badge badge-tertiary">Swapped</span>}
                            <Icon name="shuffle" size={16} />
                          </button>
                        ) : (
                          <div className="list-row" style={{ minHeight: 44 }}>{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {recipe.steps.length > 0 && (
              <section className="stack-sm">
                <h3 className="h3">Steps</h3>
                <ol className="stack-sm" style={{ listStyle: 'none' }}>
                  {recipe.steps.map((step, i) => (
                    <li key={i} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                      <span className="badge badge-primary" style={{ flexShrink: 0, width: 24, justifyContent: 'center', padding: 0 }}>{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <NutritionPanel recipe={recipe} />
          </div>
        )}
      </Sheet>

      <Sheet open={!!recipe && swapping !== null} onClose={() => setSwapping(null)} title="Swap ingredient">
        {swapping && (
          <div className="stack">
            <p className="small muted">In this meal: <strong>{applySwaps([swapping], swaps)[0]}</strong></p>
            {swaps.some((s) => s.original === swapping) && (
              <button className="btn btn-secondary btn-block" onClick={() => doSwap(swapping, null)} disabled={swapBusy}>
                Back to {swapping}
              </button>
            )}
            <SwapOptions ingredient={swapping} busy={swapBusy} onSwap={(name, meta) => doSwap(swapping, name, meta)} />
          </div>
        )}
      </Sheet>

      <MealSheet
        open={planOpen}
        onClose={() => { setPlanOpen(false); close(); }}
        preset={recipe ? { date: todayISO(), title: recipe.title, description: recipe.description, recipeId: recipe.id } : undefined}
      />
    </>
  );
}

export function RecipeMeta({ recipe }: { recipe: Recipe }) {
  const time = totalTimeMinutes(recipe);
  return (
    <div className="stack-sm">
      {time > 0 && <RecipeTimes prep={recipe.prepTimeMinutes} cook={recipe.cookTimeMinutes} total={time} />}
      <RecipeChips recipe={recipe} />
    </div>
  );
}

/** Prep, cook and total time side by side ("—" for a part the recipe doesn't give). */
export function RecipeTimes({ prep, cook, total }: { prep: number | null | undefined; cook: number | null | undefined; total: number }) {
  const cells: [string, string | null][] = [
    ['Prep', formatMinutes(prep)],
    ['Cook', formatMinutes(cook)],
    ['Total', formatMinutes(total)],
  ];
  return (
    <div className="recipe-times" role="group" aria-label="Time">
      {cells.map(([label, value]) => (
        <div key={label} className={label === 'Total' ? 'recipe-time recipe-time-total' : 'recipe-time'}>
          <span className="tiny muted">{label === 'Total' ? <><Icon name="clock" size={12} /> {label}</> : label}</span>
          <strong>{value ?? '—'}</strong>
        </div>
      ))}
    </div>
  );
}

function RecipeChips({ recipe }: { recipe: Recipe }) {
  return (
    <div className="chips">
      {recipe.calories != null && <span className="badge"><Icon name="flame" size={12} />&nbsp;{recipe.calories} kcal</span>}
      {recipe.dietType && <span className="badge badge-accent">{recipe.dietType}</span>}
      {recipe.cuisine && <span className="badge">{recipe.cuisine}</span>}
      {recipe.servings != null && <span className="badge">Serves {recipe.servings}</span>}
    </div>
  );
}

function ClassifyButton({ label, icon, active, onClick }: { label: string; icon: 'heart' | 'star' | 'thumbsDown'; active: boolean; onClick: () => void }) {
  return (
    <button className="chip grow" aria-pressed={active} onClick={onClick} style={{ justifyContent: 'center' }}>
      <Icon name={icon} size={16} filled={active && icon !== 'thumbsDown'} /> {label}
    </button>
  );
}

/** Per-serving nutrition, when the recipe has any. */
function NutritionPanel({ recipe }: { recipe: Recipe }) {
  const rows = NUTRIENTS.filter((n) => recipe.nutrition[n.key] != null);
  if (recipe.calories == null && rows.length === 0) return null;
  return (
    <section className="stack-sm">
      <h3 className="h3">Nutrition <span className="small muted" style={{ fontWeight: 500 }}>per serving</span></h3>
      <div className="nutrition-grid">
        {recipe.calories != null && (
          <div className="nutrition-cell"><strong>{recipe.calories}</strong><span>Calories</span></div>
        )}
        {rows.map((n) => (
          <div key={n.key} className="nutrition-cell"><strong>{recipe.nutrition[n.key]}{n.unit}</strong><span>{n.label}</span></div>
        ))}
      </div>
    </section>
  );
}
