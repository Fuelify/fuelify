// Auth store — powered by Supabase Auth
// Replaces the old ApiClient + TokenStorage + DynamoDB approach

import { createStore } from 'zustand/vanilla';
import type { TypedSupabaseClient } from '../supabase/client';

export type AuthenticationStatus = 'loggedIn' | 'authenticating' | 'loggedOut' | 'loading';

export interface AuthState {
  status: AuthenticationStatus;
  userId: string | null;
  email: string | null;
  /** True for the anonymous session created when the login gate is disabled */
  isAnonymous: boolean;
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
  isAnonymous: false,
  error: null,
};

export interface AuthStoreOptions {
  // When true, the login gate is bypassed: if there is no session on startup
  // we sign in anonymously so a real user id exists for RLS-protected data.
  authDisabled?: boolean;
}

function sessionState(user: { id: string; email?: string | null; is_anonymous?: boolean }) {
  return {
    status: 'loggedIn' as const,
    userId: user.id,
    email: user.email || null,
    isAnonymous: user.is_anonymous ?? false,
  };
}

export function createAuthStore(supabase: TypedSupabaseClient, options: AuthStoreOptions = {}) {
  return createStore<AuthStore>()((set, get) => ({
    ...initialState,

    // Check for existing session on app startup
    initialize: async () => {
      set({ status: 'loading' });
      let { data: { session } } = await supabase.auth.getSession();
      // Guest (anonymous) sessions only make sense while the login gate is off.
      // A guest session left over from that mode must not stand in for a login.
      if (session?.user.is_anonymous && !options.authDisabled) {
        await supabase.auth.signOut();
        session = null;
      }
      if (!session && options.authDisabled) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) set({ error: error.message });
        session = data.session;
      }
      if (session?.user) {
        set({ ...sessionState(session.user), error: null });
      } else {
        set({ status: 'loggedOut', userId: null, email: null, isAnonymous: false });
      }

      // Listen for auth state changes (token refresh, sign out from another tab, etc.)
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          set(sessionState(session.user));
        } else {
          set({ status: 'loggedOut', userId: null, email: null, isAnonymous: false });
        }
      });
    },

    signUp: async (email: string, password: string) => {
      // An anonymous user keeps their id (and all their data) by attaching
      // an email + password to the existing account instead of signing up anew.
      if (get().isAnonymous) {
        set({ error: null });
        const { data, error } = await supabase.auth.updateUser({ email, password });
        if (error) {
          set({ error: error.message });
          return { status: false, message: error.message };
        }
        if (data.user) set(sessionState(data.user));
        return { status: true, message: 'Account created — check your email to confirm it' };
      }

      set({ status: 'authenticating', error: null });
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        set({ status: 'loggedOut', error: error.message });
        return { status: false, message: error.message };
      }

      if (data.user) set({ ...sessionState(data.user), error: null });
      return { status: true, message: 'Account created successfully' };
    },

    signIn: async (email: string, password: string) => {
      const previousStatus = get().status;
      set({ status: 'authenticating', error: null });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // A failed sign-in leaves any existing (e.g. anonymous) session intact
        set({ status: previousStatus === 'loggedIn' ? 'loggedIn' : 'loggedOut', error: error.message });
        return { status: false, message: error.message };
      }

      if (data.user) set({ ...sessionState(data.user), error: null });
      return { status: true, message: 'Successful' };
    },

    signOut: async () => {
      await supabase.auth.signOut();
      set({ ...initialState, status: 'loggedOut' });
      // With the login gate disabled, immediately start a fresh anonymous session
      if (options.authDisabled) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) set({ error: error.message });
        else if (data.user) set(sessionState(data.user));
      }
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
