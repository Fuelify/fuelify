// Community stats and member photos for recipes, cached per session.

import { createStore } from 'zustand/vanilla';
import type { RecipeCommunityStats, RecipePhoto } from '../models/community';
import type { CommunityRepository } from '../supabase/community-repo';

export interface CommunityState {
  stats: Record<string, RecipeCommunityStats>;
  photos: Record<string, RecipePhoto[]>;
  /** Showcased photos per recipe (for Discover cards) */
  showcased: Record<string, RecipePhoto[]>;
  /** null until checked */
  isAdmin: boolean | null;
  /** Admins: photos waiting to be showcased */
  pending: (RecipePhoto & { recipeTitle: string })[] | null;
  uploading: string[];
  error: string | null;
}

export interface CommunityActions {
  /** Load stats for recipes not loaded yet (one request for the batch). */
  loadStats: (recipeIds: string[]) => Promise<void>;
  loadPhotos: (recipeId: string) => Promise<void>;
  /** Add a member photo (resized JPEG). Resolves true on success. */
  addPhoto: (recipeId: string, image: Blob) => Promise<boolean>;
  removePhoto: (photo: RecipePhoto) => Promise<boolean>;
  /** Load showcased photos for recipes not loaded yet. */
  loadShowcased: (recipeIds: string[]) => Promise<void>;
  checkAdmin: () => Promise<boolean>;
  loadPending: () => Promise<void>;
  /** Admins: showcase a photo to everyone (or make it private again). */
  setFeatured: (photo: RecipePhoto, featured: boolean) => Promise<boolean>;
}

export type CommunityStore = CommunityState & CommunityActions;

export function createCommunityStore(
  repo: Pick<CommunityRepository, 'stats' | 'photos' | 'addPhoto' | 'removePhoto' | 'showcased' | 'isAdmin' | 'pending' | 'setFeatured'>,
  userId: string,
) {
  const pending = new Set<string>();
  const showcaseAsked = new Set<string>();
  return createStore<CommunityStore>()((set, get) => ({
    stats: {},
    photos: {},
    showcased: {},
    isAdmin: null,
    pending: null,
    uploading: [],
    error: null,

    loadStats: async (recipeIds) => {
      const want = [...new Set(recipeIds)].filter((id) => !get().stats[id] && !pending.has(id));
      if (want.length === 0) return;
      want.forEach((id) => pending.add(id));
      try {
        const rows = await repo.stats(want);
        set((s) => ({ stats: { ...s.stats, ...Object.fromEntries(rows.map((r) => [r.recipeId, r])) } }));
      } catch {
        // Stats are decoration; never block the deck on them
      } finally {
        want.forEach((id) => pending.delete(id));
      }
    },

    loadPhotos: async (recipeId) => {
      try {
        const photos = await repo.photos(recipeId);
        set((s) => ({ photos: { ...s.photos, [recipeId]: photos } }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    addPhoto: async (recipeId, image) => {
      set((s) => ({ uploading: [...s.uploading, recipeId], error: null }));
      try {
        const photo = await repo.addPhoto(userId, recipeId, image);
        set((s) => ({ photos: { ...s.photos, [recipeId]: [photo, ...(s.photos[recipeId] ?? [])] } }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      } finally {
        set((s) => ({ uploading: s.uploading.filter((id) => id !== recipeId) }));
      }
    },

    removePhoto: async (photo) => {
      try {
        await repo.removePhoto(photo);
        set((s) => ({
          photos: { ...s.photos, [photo.recipeId]: (s.photos[photo.recipeId] ?? []).filter((p) => p.id !== photo.id) },
          showcased: { ...s.showcased, [photo.recipeId]: (s.showcased[photo.recipeId] ?? []).filter((p) => p.id !== photo.id) },
          pending: s.pending?.filter((p) => p.id !== photo.id) ?? null,
        }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },

    loadShowcased: async (recipeIds) => {
      const want = [...new Set(recipeIds)].filter((id) => !showcaseAsked.has(id));
      if (want.length === 0) return;
      want.forEach((id) => showcaseAsked.add(id));
      try {
        const rows = await repo.showcased(want);
        const by: Record<string, RecipePhoto[]> = Object.fromEntries(want.map((id) => [id, []]));
        for (const p of rows) by[p.recipeId] = [...(by[p.recipeId] ?? []), p];
        set((s) => ({ showcased: { ...s.showcased, ...by } }));
      } catch {
        want.forEach((id) => showcaseAsked.delete(id));
      }
    },

    checkAdmin: async () => {
      if (get().isAdmin !== null) return get().isAdmin!;
      const isAdmin = await repo.isAdmin(userId).catch(() => false);
      set({ isAdmin });
      return isAdmin;
    },

    loadPending: async () => {
      try {
        set({ pending: await repo.pending(), error: null });
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    setFeatured: async (photo, featured) => {
      try {
        const updated = await repo.setFeatured(photo.id, featured);
        const swap = (list: RecipePhoto[] | undefined) => (list ?? []).map((p) => (p.id === updated.id ? updated : p));
        set((s) => ({
          photos: s.photos[photo.recipeId] ? { ...s.photos, [photo.recipeId]: swap(s.photos[photo.recipeId]) } : s.photos,
          showcased: {
            ...s.showcased,
            [photo.recipeId]: featured
              ? [...(s.showcased[photo.recipeId] ?? []).filter((p) => p.id !== updated.id), updated]
              : (s.showcased[photo.recipeId] ?? []).filter((p) => p.id !== updated.id),
          },
          pending: s.pending?.filter((p) => !(featured && p.id === updated.id)) ?? null,
          error: null,
        }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },
  }));
}
