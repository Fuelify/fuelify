'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserProfile } from '@fuelify/shared';
import { useProfileStore } from '../providers';

/** Answers collected across the onboarding steps (a working copy of the profile). */
export type OnboardingDraft = Partial<UserProfile>;

interface OnboardingContextValue {
  draft: OnboardingDraft;
  update: (patch: OnboardingDraft) => void;
  /** Merge into a JSON column (goals / shopping) without dropping other keys. */
  updateJson: (key: 'goals' | 'shopping', patch: Record<string, unknown>) => void;
  /** Persist the given fields (plus progress) to the profile. */
  save: (fields: (keyof UserProfile)[], step: number) => Promise<boolean>;
  saving: boolean;
  error: string | null;
  loaded: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) fetchProfile();
  }, [profile, fetchProfile]);

  // Seed the draft from the saved profile once
  useEffect(() => {
    if (profile && !loaded) {
      setDraft(profile);
      setLoaded(true);
    }
  }, [profile, loaded]);

  const update = useCallback((patch: OnboardingDraft) => setDraft((d) => ({ ...d, ...patch })), []);

  const updateJson = useCallback((key: 'goals' | 'shopping', patch: Record<string, unknown>) => {
    setDraft((d) => ({ ...d, [key]: { ...(d[key] ?? {}), ...patch } }));
  }, []);

  const save = useCallback(async (fields: (keyof UserProfile)[], step: number) => {
    setSaving(true);
    setError(null);
    const patch: Record<string, unknown> = {};
    for (const f of fields) patch[f] = draft[f] ?? null;
    // Only ever move the saved progress forward
    patch.onboardingStep = Math.max(step, profile?.onboardingStep ?? 0);
    const ok = await updateProfile(patch as Partial<UserProfile>);
    setSaving(false);
    if (!ok) setError("Couldn't save your answers. Check your connection and try again.");
    return ok;
  }, [draft, profile, updateProfile]);

  return (
    <OnboardingContext.Provider value={{ draft, update, updateJson, save, saving, error, loaded }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
