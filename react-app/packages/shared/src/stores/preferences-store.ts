// Device-level preferences (not synced to the profile): appearance and units.
// Ported from lib/providers/dark_mode.dart, extended with a 'system' option.

import { createStore } from 'zustand/vanilla';
import { isThemePreference, type ThemePreference } from '../models/theme';

export interface PreferencesState {
  theme: ThemePreference;
  units: 'Imperial' | 'Metric';
  /** When each dismissible prompt (by id) was last dismissed, epoch ms */
  dismissedAt: Record<string, number>;
}

export interface PreferencesActions {
  setTheme: (theme: ThemePreference) => void;
  setUnits: (units: 'Imperial' | 'Metric') => void;
  loadPreferences: () => void;
  dismiss: (promoId: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** True while a prompt dismissed at `dismissedAt` should stay hidden. */
export function isSnoozed(dismissedAt: number | undefined, snoozeDays: number, now: number = Date.now()): boolean {
  return dismissedAt !== undefined && now - dismissedAt < snoozeDays * DAY_MS;
}

export type PreferencesStore = PreferencesState & PreferencesActions;

/** Key-value persistence (localStorage on web; an adapter on native). */
export interface PreferencesStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const PREFERENCES_STORAGE_KEY = 'fuelify_preferences';

function defaultStorage(): PreferencesStorage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null; // storage blocked (private mode, sandboxed iframe)
  }
}

export function createPreferencesStore(storage: PreferencesStorage | null = defaultStorage()) {
  const save = (state: PreferencesState) => {
    try {
      storage?.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ theme: state.theme, units: state.units, dismissedAt: state.dismissedAt }));
    } catch {
      // Persisting is best-effort
    }
  };

  return createStore<PreferencesStore>()((set, get) => ({
    theme: 'system',
    units: 'Imperial',
    dismissedAt: {},

    dismiss: (promoId) => {
      set((state) => ({ dismissedAt: { ...state.dismissedAt, [promoId]: Date.now() } }));
      save(get());
    },

    setTheme: (theme) => {
      set({ theme });
      save(get());
    },

    setUnits: (units) => {
      set({ units });
      save(get());
    },

    loadPreferences: () => {
      try {
        const raw = storage?.getItem(PREFERENCES_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        set({
          theme: isThemePreference(parsed.theme) ? parsed.theme : parsed.isDarkMode === true ? 'dark' : 'system',
          units: parsed.units === 'Metric' ? 'Metric' : 'Imperial',
          dismissedAt: readDismissals(parsed.dismissedAt),
        });
      } catch {
        // Ignore unreadable storage
      }
    },
  }));
}

function readDismissals(v: unknown): Record<string, number> {
  if (typeof v !== 'object' || v === null) return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => typeof e[1] === 'number'));
}
