import { describe, expect, it, vi } from 'vitest';
import { createCommunityStore } from './community-store';

describe('community store', () => {
  it('batches stats, skips ones already loaded, and adds/removes photos', async () => {
    const repo = {
      stats: vi.fn(async (ids: string[]) => ids.map((id) => ({ recipeId: id, likes: 2, favorites: 1, cooked30d: 3, trending: id === 'r1' }))),
      photos: vi.fn(async () => []),
      addPhoto: vi.fn(async (_u: string, recipeId: string) => ({ id: 'p1', recipeId, url: 'x.jpg', source: 'user' as const, uploadedBy: 'u1', featured: false, createdAt: '2026-10-14' })),
      removePhoto: vi.fn(async () => undefined),
      showcased: vi.fn(async () => [{ id: 's1', recipeId: 'r2', url: 's.jpg', source: 'user' as const, uploadedBy: 'u2', featured: true, createdAt: '2026-10-10' }]),
      isAdmin: vi.fn(async () => true),
      pending: vi.fn(async () => [{ id: 'p9', recipeId: 'r3', url: 'p.jpg', source: 'user' as const, uploadedBy: 'u3', featured: false, createdAt: '2026-10-12', recipeTitle: 'Chili' }]),
      setFeatured: vi.fn(async (id: string, featured: boolean) => ({ id, recipeId: 'r3', url: 'p.jpg', source: 'user' as const, uploadedBy: 'u3', featured, createdAt: '2026-10-12' })),
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

  it('loads showcased photos once, and lets admins showcase pending ones', async () => {
    const repo = {
      stats: vi.fn(async () => []),
      photos: vi.fn(async () => []),
      addPhoto: vi.fn(),
      removePhoto: vi.fn(async () => undefined),
      showcased: vi.fn(async () => [{ id: 's1', recipeId: 'r2', url: 's.jpg', source: 'user' as const, uploadedBy: 'u2', featured: true, createdAt: '2026-10-10' }]),
      isAdmin: vi.fn(async () => true),
      pending: vi.fn(async () => [{ id: 'p9', recipeId: 'r3', url: 'p.jpg', source: 'user' as const, uploadedBy: 'u3', featured: false, createdAt: '2026-10-12', recipeTitle: 'Chili' }]),
      setFeatured: vi.fn(async (id: string, featured: boolean) => ({ id, recipeId: 'r3', url: 'p.jpg', source: 'user' as const, uploadedBy: 'u3', featured, createdAt: '2026-10-12' })),
    };
    const store = createCommunityStore(repo as never, 'admin');
    await store.getState().loadShowcased(['r1', 'r2']);
    await store.getState().loadShowcased(['r2']);
    expect(repo.showcased).toHaveBeenCalledTimes(1);
    expect(store.getState().showcased).toMatchObject({ r1: [], r2: [{ id: 's1' }] });

    expect(await store.getState().checkAdmin()).toBe(true);
    await store.getState().loadPending();
    expect(await store.getState().setFeatured(store.getState().pending![0], true)).toBe(true);
    expect(store.getState().pending).toEqual([]);
    expect(store.getState().showcased.r3.map((p) => p.id)).toEqual(['p9']);
  });
});
