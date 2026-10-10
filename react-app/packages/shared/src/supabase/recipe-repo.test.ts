import { describe, expect, it } from 'vitest';
import { RecipeRepository } from './recipe-repo';
import type { TypedSupabaseClient } from './client';

/** Minimal stand-in for the supabase-js query builder that serves rows by range. */
function fakeClient(total: number) {
  const ranges: [number, number][] = [];
  const rows = Array.from({ length: total }, (_, i) => ({
    id: `r${i}`, title: `Recipe ${i}`, description: '', image_url: null, ingredients: [], steps: [],
    prep_time_minutes: null, cook_time_minutes: null, servings: null, cuisine: null, diet_type: null, calories: null,
    created_by: null, created_at: '', updated_at: '',
  }));
  const builder = {
    select: () => builder,
    order: () => builder,
    range: (from: number, to: number) => {
      ranges.push([from, to]);
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    },
  };
  return { client: { from: () => builder } as unknown as TypedSupabaseClient, ranges };
}

describe('RecipeRepository.listAllRecipes', () => {
  it('pages until a short page so the whole catalog is returned', async () => {
    const { client, ranges } = fakeClient(53);
    const recipes = await new RecipeRepository(client).listAllRecipes(20);
    expect(recipes).toHaveLength(53);
    expect(recipes[52].title).toBe('Recipe 52');
    expect(ranges).toEqual([[0, 19], [20, 39], [40, 59]]);
  });

  it('stops after one request when the catalog fits in a page', async () => {
    const { client, ranges } = fakeClient(16);
    expect(await new RecipeRepository(client).listAllRecipes()).toHaveLength(16);
    expect(ranges).toHaveLength(1);
  });
});
