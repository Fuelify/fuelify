'use client';

import { useEffect } from 'react';
import { swapLine, withSwap, type MealPlanMeal } from '@fuelify/shared';
import { useMealPlanStore, useRecipeStore } from '@/lib/stores';
import { RecipeSheet } from '@/features/recipes/RecipeSheet';
import { useCatalogRecipe } from '@/features/recipes/useRecipeImage';

/**
 * A planned meal's full recipe (ingredients, steps, nutrition) with an
 * "Edit meal" action. Ingredients can be swapped for this meal (beef → turkey). Falls through to editing if the recipe can't be found
 * (e.g. it was deleted).
 */
export function PlannedMealRecipe({ meal, onClose, onEdit }: { meal: MealPlanMeal | null; onClose: () => void; onEdit: (meal: MealPlanMeal) => void }) {
  const recipe = useCatalogRecipe(meal?.recipeId);
  const catalogLoaded = useRecipeStore((s) => s.recipes.length > 0 && !s.isLoading);
  const setMealSwaps = useMealPlanStore((s) => s.setMealSwaps);
  // The live meal (swaps change while the sheet is open)
  const live = useMealPlanStore((s) => (meal ? Object.values(s.meals).flat().find((m) => m.id === meal.id) : undefined)) ?? meal;

  useEffect(() => {
    if (meal && catalogLoaded && !recipe) onEdit(meal);
  }, [meal, catalogLoaded, recipe, onEdit]);

  return (
    <RecipeSheet
      recipe={meal && recipe ? recipe : null}
      onClose={onClose}
      primaryAction={meal ? { label: 'Edit meal', icon: 'edit', onClick: () => onEdit(meal) } : undefined}
      swaps={live?.ingredientSwaps}
      onSwap={
        live
          ? async (original, name, meta) => {
              await setMealSwaps(live.id, withSwap(live.ingredientSwaps, original, name ? swapLine(original, name) : null), { surface: 'recipe', ...meta });
            }
          : undefined
      }
    />
  );
}
