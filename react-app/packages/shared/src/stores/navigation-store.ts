// Ported from: lib/providers/navigation_bar.dart + lib/screens/onboarding/controller.dart

import { createStore } from 'zustand/vanilla';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '../models/onboarding';

// Dashboard tab navigation
export const DASHBOARD_TABS = ['home', 'plan', 'discovery', 'food', 'cart', 'profile'] as const;
export type DashboardTab = (typeof DASHBOARD_TABS)[number];
export const DEFAULT_DASHBOARD_TAB = 1; // 'plan'

export interface NavigationState {
  currentDashboardTab: number;
  currentOnboardingStep: number;
}

export interface NavigationActions {
  setDashboardTab: (index: number) => void;
  nextOnboardingStep: () => void;
  prevOnboardingStep: () => void;
  setOnboardingStep: (step: number) => void;
  resetOnboarding: () => void;
  getCurrentOnboardingRoute: () => string;
  getOnboardingProgress: () => number;
}

export type NavigationStore = NavigationState & NavigationActions;

export function createNavigationStore() {
  return createStore<NavigationStore>()((set, get) => ({
    currentDashboardTab: DEFAULT_DASHBOARD_TAB,
    currentOnboardingStep: 0,

    setDashboardTab: (index: number) => set({ currentDashboardTab: index }),

    nextOnboardingStep: () => {
      set((state) => ({
        currentOnboardingStep: Math.min(state.currentOnboardingStep + 1, TOTAL_ONBOARDING_STEPS - 1),
      }));
    },

    prevOnboardingStep: () => {
      set((state) => ({
        currentOnboardingStep: Math.max(state.currentOnboardingStep - 1, 0),
      }));
    },

    setOnboardingStep: (step: number) => set({ currentOnboardingStep: step }),

    resetOnboarding: () => set({ currentOnboardingStep: 0 }),

    getCurrentOnboardingRoute: () => {
      return ONBOARDING_STEPS[get().currentOnboardingStep];
    },

    getOnboardingProgress: () => {
      return (get().currentOnboardingStep + 1) / TOTAL_ONBOARDING_STEPS;
    },
  }));
}
