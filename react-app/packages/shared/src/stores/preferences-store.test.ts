import { describe, expect, it } from 'vitest';
import { createPreferencesStore, PREFERENCES_STORAGE_KEY, type PreferencesStorage } from './preferences-store';
import { resolveTheme } from '../models/theme';

const memoryStorage = (initial: Record<string, string> = {}): PreferencesStorage & { data: Record<string, string> } => {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

describe('theme', () => {
  it('resolves system to the OS setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('preferences store', () => {
  it('defaults to following the system', () => {
    expect(createPreferencesStore(memoryStorage()).getState().theme).toBe('system');
  });

  it('persists and reloads the theme', () => {
    const storage = memoryStorage();
    createPreferencesStore(storage).getState().setTheme('dark');
    const reloaded = createPreferencesStore(storage);
    reloaded.getState().loadPreferences();
    expect(reloaded.getState().theme).toBe('dark');
  });

  it('migrates the old isDarkMode flag and ignores junk', () => {
    const legacy = createPreferencesStore(memoryStorage({ [PREFERENCES_STORAGE_KEY]: JSON.stringify({ isDarkMode: true }) }));
    legacy.getState().loadPreferences();
    expect(legacy.getState().theme).toBe('dark');
    const junk = createPreferencesStore(memoryStorage({ [PREFERENCES_STORAGE_KEY]: '{not json' }));
    junk.getState().loadPreferences();
    expect(junk.getState().theme).toBe('system');
  });

  it('works without storage', () => {
    const store = createPreferencesStore(null);
    store.getState().setTheme('light');
    expect(store.getState().theme).toBe('light');
  });
});
