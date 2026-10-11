import { describe, expect, it } from 'vitest';
import { createPreferencesStore, isSnoozed, PREFERENCES_STORAGE_KEY, type PreferencesStorage } from './preferences-store';
import { HIGHLIGHTED_PREMIUM_FEATURE, isPremium } from '../models/subscription';
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

describe('dismissible prompts', () => {
  it('snoozes for the given number of days', () => {
    const day = 24 * 60 * 60 * 1000;
    const t = 1_000_000_000_000;
    expect(isSnoozed(undefined, 7, t)).toBe(false);
    expect(isSnoozed(t - 6 * day, 7, t)).toBe(true);
    expect(isSnoozed(t - 8 * day, 7, t)).toBe(false);
  });

  it('records and reloads dismissals, ignoring junk', () => {
    const storage = memoryStorage();
    createPreferencesStore(storage).getState().dismiss('promo');
    const reloaded = createPreferencesStore(storage);
    reloaded.getState().loadPreferences();
    expect(typeof reloaded.getState().dismissedAt.promo).toBe('number');
    const junk = createPreferencesStore(memoryStorage({ [PREFERENCES_STORAGE_KEY]: JSON.stringify({ dismissedAt: { a: 'x', b: 5 } }) }));
    junk.getState().loadPreferences();
    expect(junk.getState().dismissedAt).toEqual({ b: 5 });
  });

  it('undismiss shows a prompt again and persists that', () => {
    const storage = memoryStorage();
    const store = createPreferencesStore(storage);
    store.getState().dismiss('promo');
    store.getState().undismiss('promo');
    expect(store.getState().dismissedAt.promo).toBeUndefined();
    const reloaded = createPreferencesStore(storage);
    reloaded.getState().loadPreferences();
    expect(reloaded.getState().dismissedAt.promo).toBeUndefined();
  });
});

describe('subscription', () => {
  it('treats anything but premium as standard', () => {
    expect(isPremium({ plan: 'premium' })).toBe(true);
    expect(isPremium({ plan: 'standard' })).toBe(false);
    expect(isPremium({ plan: 'Premium' })).toBe(false);
    expect(isPremium(null)).toBe(false);
  });

  it('leads with auto-generated weekly meal plans', () => {
    expect(HIGHLIGHTED_PREMIUM_FEATURE.id).toBe('auto-weekly-plans');
  });
});
