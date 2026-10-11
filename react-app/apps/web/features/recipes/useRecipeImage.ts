'use client';

import { useEffect } from 'react';
import type { Recipe } from '@fuelify/shared';
import { useRecipeStore } from '@/lib/stores';

let requested = false;

/**
 * A planned meal's recipe, from the catalog (loaded once per session on first
 * use). Meals only keep the recipe id. Undefined while loading or not found.
 */
export function useCatalogRecipe(recipeId: string | null | undefined): Recipe | undefined {
  const catalogEmpty = useRecipeStore((s) => s.recipes.length === 0);
  const loadCatalog = useRecipeStore((s) => s.loadCatalog);
  const recipe = useRecipeStore((s) => (recipeId ? s.recipes.find((r) => r.id === recipeId) : undefined));

  useEffect(() => {
    if (recipeId && catalogEmpty && !requested) {
      requested = true;
      loadCatalog().finally(() => {
        requested = false;
      });
    }
  }, [recipeId, catalogEmpty, loadCatalog]);

  return recipe;
}

/** Photo for a planned meal's recipe. */
export function useRecipeImage(recipeId: string | null | undefined): string | null {
  return useCatalogRecipe(recipeId)?.imageUrl ?? null;
}
