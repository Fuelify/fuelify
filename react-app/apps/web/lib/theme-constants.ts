// Theme constants shared by the server layout and the client theme controller.
// Plain module (no 'use client') so the server can read the values.
import { PREFERENCES_STORAGE_KEY, type ResolvedTheme } from '@fuelify/shared';

export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Browser chrome colour per theme (matches --surface). */
export const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#f6f7fd', dark: '#11142a' };

/**
 * Runs before React hydrates (inlined in <head>) so the first paint already
 * uses the right theme. Mirrors resolveTheme(); keep the two in sync.
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement,m=window.matchMedia('${DARK_QUERY}').matches,p='system';try{var r=localStorage.getItem('${PREFERENCES_STORAGE_KEY}');if(r){var j=JSON.parse(r);p=j.theme||(j.isDarkMode?'dark':'system');}}catch(e){}var t=p==='system'?(m?'dark':'light'):p;d.setAttribute('data-theme',t);})();`;

