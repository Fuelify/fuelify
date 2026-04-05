// Ported from: lib/providers/dark_mode.dart

import { createStore } from 'zustand/vanilla';

export interface PreferencesState {
  isDarkMode: boolean;
  units: 'Imperial' | 'Metric';
}

export interface PreferencesActions {
  toggleDarkMode: () => void;
  setUnits: (units: 'Imperial' | 'Metric') => void;
  loadPreferences: () => void;
  savePreferences: () => void;
}

export type PreferencesStore = PreferencesState & PreferencesActions;

const STORAGE_KEY = 'fuelify_preferences';

export function createPreferencesStore() {
  return createStore<PreferencesStore>()((set, get) => ({
    isDarkMode: false,
    units: 'Imperial',

    toggleDarkMode: () => {
      set((state) => ({ isDarkMode: !state.isDarkMode }));
      get().savePreferences();
    },

    setUnits: (units: 'Imperial' | 'Metric') => {
      set({ units });
      get().savePreferences();
    },

    loadPreferences: () => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          set({
            isDarkMode: parsed.isDarkMode ?? false,
            units: parsed.units ?? 'Imperial',
          });
        }
      } catch {
        // Ignore parse errors
      }
    },

    savePreferences: () => {
      if (typeof window === 'undefined') return;
      const { isDarkMode, units } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ isDarkMode, units }));
    },
  }));
}
