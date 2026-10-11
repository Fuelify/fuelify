'use client';

import { useEffect } from 'react';
import type { MealPlanMeal } from '@fuelify/shared';
import { useRecipeStore } from '@/lib/stores';
import { RecipeSheet } from '@/features/recipes/RecipeSheet';
import { useCatalogRecipe } from '@/features/recipes/useRecipeImage';

/**
 * A planned meal's full recipe (ingredients, steps, nutrition) with an
 * "Edit meal" action. Falls through to editing if the recipe can't be found
 * (e.g. it was deleted).
 */
export function PlannedMealRecipe({ meal, onClose, onEdit }: { meal: MealPlanMeal | null; onClose: () => void; onEdit: (meal: MealPlanMeal) => void }) {
  const recipe = useCatalogRecipe(meal?.recipeId);
  const catalogLoaded = useRecipeStore((s) => s.recipes.length > 0 && !s.isLoading);

  useEffect(() => {
    if (meal && catalogLoaded && !recipe) onEdit(meal);
  }, [meal, catalogLoaded, recipe, onEdit]);

  return (
    <RecipeSheet
      recipe={meal && recipe ? recipe : null}
      onClose={onClose}
      primaryAction={meal ? { label: 'Edit meal', icon: 'edit', onClick: () => onEdit(meal) } : undefined}
    />
  );
}
