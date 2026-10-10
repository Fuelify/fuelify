import { describe, expect, it, vi } from 'vitest';
import { createAuthStore } from './auth-store';
import type { TypedSupabaseClient } from '../supabase/client';

function fakeSupabase(user: { id: string; email?: string; is_anonymous?: boolean } | null) {
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: user ? { user } : null } })),
    signOut: vi.fn(async () => ({ error: null })),
    signInAnonymously: vi.fn(async () => ({ data: { session: { user: { id: 'anon-2', is_anonymous: true } }, user: { id: 'anon-2', is_anonymous: true } }, error: null })),
    onAuthStateChange: vi.fn(),
  };
  return { client: { auth } as unknown as TypedSupabaseClient, auth };
}

describe('auth store initialize', () => {
  it('drops a leftover guest session when login is required', async () => {
    const { client, auth } = fakeSupabase({ id: 'anon-1', is_anonymous: true });
    const store = createAuthStore(client, { authDisabled: false });
    await store.getState().initialize();
    expect(auth.signOut).toHaveBeenCalled();
    expect(store.getState().status).toBe('loggedOut');
    expect(store.getState().userId).toBeNull();
  });

  it('keeps a real signed-in session', async () => {
    const { client, auth } = fakeSupabase({ id: 'u1', email: 'etminier@outlook.com' });
    const store = createAuthStore(client, { authDisabled: false });
    await store.getState().initialize();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({ status: 'loggedIn', userId: 'u1', isAnonymous: false });
  });

  it('keeps the guest session while the login gate is disabled', async () => {
    const { client, auth } = fakeSupabase({ id: 'anon-1', is_anonymous: true });
    const store = createAuthStore(client, { authDisabled: true });
    await store.getState().initialize();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({ status: 'loggedIn', userId: 'anon-1', isAnonymous: true });
  });

  it('starts a guest session when the gate is disabled and nobody is signed in', async () => {
    const { client, auth } = fakeSupabase(null);
    const store = createAuthStore(client, { authDisabled: true });
    await store.getState().initialize();
    expect(auth.signInAnonymously).toHaveBeenCalled();
    expect(store.getState().userId).toBe('anon-2');
  });
});
