'use client';

import { useState } from 'react';
import { NUTRIENTS, type Recipe, todayISO, totalTimeMinutes } from '@fuelify/shared';
import { useHouseholdStore, useRecipeStore, useShoppingCartStore } from '@/lib/stores';
import { FoodImage, Icon, Sheet } from '@/components/ui';
import { MealSheet } from '@/features/meals/MealSheet';

/**
 * Recipe detail: ingredients, steps, nutrition, like/favorite, add ingredients
 * to cart, and a primary action (default: add to plan; the Plan page passes
 * "Edit meal" for a meal that's already planned).
 */
export function RecipeSheet({
  recipe,
  onClose,
  primaryAction,
}: {
  recipe: Recipe | null;
  onClose: () => void;
  primaryAction?: { label: string; icon: 'edit' | 'calendar'; onClick: () => void };
}) {
  const classifications = useRecipeStore((s) => s.classifications);
  const classifyRecipe = useRecipeStore((s) => s.classifyRecipe);
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const addCartItem = useShoppingCartStore((s) => s.addItem);

  const [planOpen, setPlanOpen] = useState(false);
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
        open={!!recipe && !planOpen}
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
                <ul className="list" style={{ listStyle: 'none' }}>
                  {recipe.ingredients.map((ing) => (
                    <li key={ing} className="list-row" style={{ minHeight: 44 }}>{ing}</li>
                  ))}
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
    <div className="chips">
      {time > 0 && <span className="badge"><Icon name="clock" size={12} />&nbsp;{time} min</span>}
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
