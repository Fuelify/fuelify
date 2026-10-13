// Profile store — user profile data from Supabase PostgreSQL profiles table
// Replaces the old User model that was stored in DynamoDB

import { createStore } from 'zustand/vanilla';
import type { ProfileRepository, UserProfile } from '../supabase/profile-repo';

export interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export interface ProfileActions {
  fetchProfile: () => Promise<void>;
  /** Resolves true on success; failures are also recorded in `error`. */
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  /** Upload a new profile picture (a resized JPEG). Resolves true on success. */
  uploadAvatar: (image: Blob) => Promise<boolean>;
  removeAvatar: () => Promise<boolean>;
  completeOnboarding: () => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  setUnits: (units: string) => Promise<void>;
  clear: () => void;
}

export type ProfileStore = ProfileState & ProfileActions;

export function createProfileStore(repo: ProfileRepository, userId: string) {
  return createStore<ProfileStore>()((set, get) => ({
    profile: null,
    isLoading: false,
    error: null,

    fetchProfile: async () => {
      set({ isLoading: true, error: null });
      try {
        const profile = await repo.getProfile(userId);
        set({ profile, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    updateProfile: async (updates) => {
      set({ isLoading: true, error: null });
      try {
        const profile = await repo.updateProfile(userId, updates);
        set({ profile, isLoading: false });
        return true;
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
        return false;
      }
    },

    uploadAvatar: async (image) => {
      set({ error: null });
      try {
        set({ profile: await repo.uploadAvatar(userId, image) });
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },

    removeAvatar: async () => {
      set({ error: null });
      try {
        set({ profile: await repo.deleteAvatar(userId) });
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },

    completeOnboarding: async () => {
      try {
        await repo.completeOnboarding(userId);
        const current = get().profile;
        if (current) {
          set({ profile: { ...current, onboarded: true } });
        }
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    toggleDarkMode: async () => {
      const current = get().profile;
      if (!current) return;
      const newMode = !current.darkMode;
      try {
        await repo.updateProfile(userId, { darkMode: newMode });
        set({ profile: { ...current, darkMode: newMode } });
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    setUnits: async (units: string) => {
      const current = get().profile;
      if (!current) return;
      try {
        await repo.updateProfile(userId, { units });
        set({ profile: { ...current, units } });
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    clear: () => set({ profile: null, isLoading: false, error: null }),
  }));
}
