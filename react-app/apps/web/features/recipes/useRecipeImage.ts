'use client';

import { useEffect } from 'react';
import { useRecipeStore } from '@/lib/stores';

let requested = false;

/**
 * Photo for a planned meal's recipe. Meals only keep the recipe id, so this
 * reads the catalog (loaded once per session on first use).
 */
export function useRecipeImage(recipeId: string | null | undefined): string | null {
  const catalogEmpty = useRecipeStore((s) => s.recipes.length === 0);
  const loadCatalog = useRecipeStore((s) => s.loadCatalog);
  const imageUrl = useRecipeStore((s) => (recipeId ? s.recipes.find((r) => r.id === recipeId)?.imageUrl ?? null : null));

  useEffect(() => {
    if (recipeId && catalogEmpty && !requested) {
      requested = true;
      loadCatalog().finally(() => {
        requested = false;
      });
    }
  }, [recipeId, catalogEmpty, loadCatalog]);

  return imageUrl;
}
