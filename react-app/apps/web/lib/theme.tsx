'use client';

import { useEffect, useState } from 'react';
import { resolveTheme, type ResolvedTheme } from '@fuelify/shared';
import { usePreferencesStore } from './stores';
import { DARK_QUERY, THEME_COLORS } from './theme-constants';

function useSystemPrefersDark(): boolean {
  const [dark, setDark] = useState(() => typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setDark(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

/** The theme currently shown. */
export function useResolvedTheme(): ResolvedTheme {
  const preference = usePreferencesStore((s) => s.theme);
  return resolveTheme(preference, useSystemPrefersDark());
}

/** Keeps <html data-theme> and the browser theme-color in sync with the preference and OS. */
export function ThemeController() {
  const loadPreferences = usePreferencesStore((s) => s.loadPreferences);
  const theme = useResolvedTheme();

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', THEME_COLORS[theme]));
  }, [theme]);

  return null;
}
