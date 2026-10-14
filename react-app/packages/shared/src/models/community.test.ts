import { describe, expect, it } from 'vitest';
import { cardPhoto, communityHighlights, photoAudience, recipeGallery, type RecipePhoto } from './community';

const photo = (id: string, url: string, createdAt: string, extra: Partial<RecipePhoto> = {}): RecipePhoto => ({ id, recipeId: 'r1', url, source: 'user', uploadedBy: 'other', featured: true, createdAt, ...extra });

describe('community', () => {
  it('orders: recipe photo, yours, showcased, then (for admins) pending', () => {
    const g = recipeGallery({ id: 'r1', imageUrl: 'stock.jpg' }, [
      photo('pend', 'pend.jpg', '2026-10-09', { featured: false }),
      photo('show', 'show.jpg', '2026-10-08'),
      photo('mine', 'mine.jpg', '2026-10-01', { uploadedBy: 'me', featured: false }),
    ], 'me');
    expect(g.map((p) => p.id)).toEqual(['stock-r1', 'mine', 'show', 'pend']);
    expect(photoAudience(g[1], 'me')).toBe('yours');
    expect(photoAudience(g[3], 'me')).toBe('pending');
  });

  it('cards use the recipe photo, else the newest showcased one', () => {
    expect(cardPhoto({ imageUrl: 'stock.jpg' }, [photo('a', 'a.jpg', '2026-10-01')])).toBe('stock.jpg');
    expect(cardPhoto({ imageUrl: null }, [photo('a', 'a.jpg', '2026-10-01'), photo('b', 'b.jpg', '2026-10-05'), photo('c', 'c.jpg', '2026-10-09', { featured: false })])).toBe('b.jpg');
    expect(cardPhoto({ imageUrl: null }, [])).toBeNull();
  });

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
