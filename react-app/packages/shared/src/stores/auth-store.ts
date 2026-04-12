// Auth store — powered by Supabase Auth
// Replaces the old ApiClient + TokenStorage + DynamoDB approach

import { createStore } from 'zustand/vanilla';
import type { TypedSupabaseClient } from '../supabase/client';

export type AuthenticationStatus = 'loggedIn' | 'authenticating' | 'loggedOut' | 'loading';

export interface AuthState {
  status: AuthenticationStatus;
  userId: string | null;
  email: string | null;
  error: string | null;
}

export interface AuthActions {
  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ status: boolean; message: string }>;
  signIn: (email: string, password: string) => Promise<{ status: boolean; message: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ status: boolean; message: string }>;
  reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  status: 'loading',
  userId: null,
  email: null,
  error: null,
};

export function createAuthStore(supabase: TypedSupabaseClient) {
  return createStore<AuthStore>()((set) => ({
    ...initialState,

    // Check for existing session on app startup
    initialize: async () => {
      set({ status: 'loading' });
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({
          status: 'loggedIn',
          userId: session.user.id,
          email: session.user.email ?? null,
          error: null,
        });
      } else {
        set({ status: 'loggedOut', userId: null, email: null });
      }

      // Listen for auth state changes (token refresh, sign out from another tab, etc.)
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          set({
            status: 'loggedIn',
            userId: session.user.id,
            email: session.user.email ?? null,
          });
        } else {
          set({ status: 'loggedOut', userId: null, email: null });
        }
      });
    },

    signUp: async (email: string, password: string) => {
      set({ status: 'authenticating', error: null });
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        set({ status: 'loggedOut', error: error.message });
        return { status: false, message: error.message };
      }

      if (data.user) {
        set({
          status: 'loggedIn',
          userId: data.user.id,
          email: data.user.email ?? null,
          error: null,
        });
      }
      return { status: true, message: 'Account created successfully' };
    },

    signIn: async (email: string, password: string) => {
      set({ status: 'authenticating', error: null });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        set({ status: 'loggedOut', error: error.message });
        return { status: false, message: error.message };
      }

      if (data.user) {
        set({
          status: 'loggedIn',
          userId: data.user.id,
          email: data.user.email ?? null,
          error: null,
        });
      }
      return { status: true, message: 'Successful' };
    },

    signOut: async () => {
      await supabase.auth.signOut();
      set({ ...initialState, status: 'loggedOut' });
    },

    resetPassword: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        return { status: false, message: error.message };
      }
      return { status: true, message: 'Password reset email sent' };
    },

    reset: () => set({ ...initialState, status: 'loggedOut' }),
  }));
}
