// Ported from: lib/providers/authentication.dart + lib/providers/internals/authentication/service.dart

import { createStore } from 'zustand/vanilla';
import type { ApiClient } from '../api/client';
import type { TokenStorage } from '../api/token-storage';
import type { User } from '../models/user';
import { parseUser } from '../models/user';

export type AuthenticationStatus = 'loggedIn' | 'authenticating' | 'loggedOut';

export interface AuthState {
  status: AuthenticationStatus;
  user: User | null;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<{ status: boolean; message: string }>;
  logout: () => Promise<void>;
  checkToken: () => Promise<boolean>;
  setStatus: (status: AuthenticationStatus) => void;
  reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  status: 'loggedOut',
  user: null,
  error: null,
};

export function createAuthStore(apiClient: ApiClient, tokenStorage: TokenStorage) {
  return createStore<AuthStore>()((set) => ({
    ...initialState,

    login: async (email: string, password: string) => {
      set({ status: 'authenticating', error: null });
      try {
        const response = await apiClient.login({ email, password });
        const userData = response.data?.data;
        const user = parseUser(userData);

        // Store tokens
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 24); // 24h expiry
        await tokenStorage.storeTokens(user.token, user.refreshToken, expiryTime);

        set({ status: 'loggedIn', user, error: null });
        return { status: true, message: 'Successful' };
      } catch (err) {
        set({ status: 'loggedOut', error: (err as Error).message });
        return { status: false, message: (err as Error).message };
      }
    },

    logout: async () => {
      try {
        await apiClient.logout();
      } catch {
        // Continue logout even if API call fails
      }
      await tokenStorage.deleteTokens();
      set(initialState);
    },

    checkToken: async () => {
      const tokens = await tokenStorage.readTokens();
      if (tokens.accessToken && tokens.expiryTime && tokens.expiryTime > new Date()) {
        set({ status: 'loggedIn' });
        return true;
      }
      set({ status: 'loggedOut' });
      return false;
    },

    setStatus: (status: AuthenticationStatus) => set({ status }),

    reset: () => set(initialState),
  }));
}
