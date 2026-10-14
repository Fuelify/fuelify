import { describe, expect, it, vi } from 'vitest';
import { createCommunityStore } from './community-store';

describe('community store', () => {
  it('batches stats, skips ones already loaded, and adds/removes photos', async () => {
    const repo = {
      stats: vi.fn(async (ids: string[]) => ids.map((id) => ({ recipeId: id, likes: 2, favorites: 1, cooked30d: 3, trending: id === 'r1' }))),
      photos: vi.fn(async () => []),
      addPhoto: vi.fn(async (_u: string, recipeId: string) => ({ id: 'p1', recipeId, url: 'x.jpg', source: 'user' as const, uploadedBy: 'u1', createdAt: '2026-10-14' })),
      removePhoto: vi.fn(async () => undefined),
    };
    const store = createCommunityStore(repo, 'u1');
    await store.getState().loadStats(['r1', 'r2']);
    await store.getState().loadStats(['r1', 'r2', 'r3']);
    expect(repo.stats.mock.calls.map((c) => c[0])).toEqual([['r1', 'r2'], ['r3']]);
    expect(store.getState().stats.r1.trending).toBe(true);

    expect(await store.getState().addPhoto('r1', new Blob())).toBe(true);
    expect(store.getState().photos.r1.map((p) => p.id)).toEqual(['p1']);
    expect(await store.getState().removePhoto(store.getState().photos.r1[0])).toBe(true);
    expect(store.getState().photos.r1).toEqual([]);
  });
});
