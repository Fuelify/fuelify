// Community stats and member photos for recipes, cached per session.

import { createStore } from 'zustand/vanilla';
import type { RecipeCommunityStats, RecipePhoto } from '../models/community';
import type { CommunityRepository } from '../supabase/community-repo';

export interface CommunityState {
  stats: Record<string, RecipeCommunityStats>;
  photos: Record<string, RecipePhoto[]>;
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
}

export type CommunityStore = CommunityState & CommunityActions;

export function createCommunityStore(repo: Pick<CommunityRepository, 'stats' | 'photos' | 'addPhoto' | 'removePhoto'>, userId: string) {
  const pending = new Set<string>();
  return createStore<CommunityStore>()((set, get) => ({
    stats: {},
    photos: {},
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
        set((s) => ({ photos: { ...s.photos, [photo.recipeId]: (s.photos[photo.recipeId] ?? []).filter((p) => p.id !== photo.id) } }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },
  }));
}
