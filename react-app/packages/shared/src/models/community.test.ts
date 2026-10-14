import { describe, expect, it } from 'vitest';
import { communityHighlights, recipeGallery, type RecipePhoto } from './community';

const photo = (id: string, url: string, createdAt: string, source: RecipePhoto['source'] = 'user'): RecipePhoto => ({ id, recipeId: 'r1', url, source, uploadedBy: 'u', createdAt });

describe('community', () => {
  it('puts the recipe photo first, then members newest first, without duplicates', () => {
    const g = recipeGallery({ id: 'r1', imageUrl: 'stock.jpg' }, [photo('a', 'a.jpg', '2026-10-01'), photo('b', 'b.jpg', '2026-10-05'), photo('dup', 'stock.jpg', '2026-10-06')]);
    expect(g.map((p) => p.url)).toEqual(['stock.jpg', 'b.jpg', 'a.jpg']);
    expect(recipeGallery({ id: 'r1', imageUrl: null }, [])).toEqual([]);
  });

  it('says only what there is to say', () => {
    expect(communityHighlights({ recipeId: 'r1', likes: 1, favorites: 0, cooked30d: 8, trending: false })).toEqual(['1 like', 'Cooked 8× this month']);
    expect(communityHighlights({ recipeId: 'r1', likes: 0, favorites: 0, cooked30d: 0, trending: false })).toEqual([]);
  });
});
