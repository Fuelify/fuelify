'use client';

// Connecting a person's Kroger account (so the cart can go straight into their
// Kroger cart). Kroger sends them back to /kroger/callback with a code, which
// our server exchanges and stores encrypted.

import type { TypedSupabaseClient } from '@fuelify/shared';

const STATE_KEY = 'fuelify.kroger.state';
const RETURN_KEY = 'fuelify.kroger.return';

async function call<T>(supabase: TypedSupabaseClient, init: RequestInit & { query?: string } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`/api/kroger/link${init.query ?? ''}`, {
    ...init,
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
  }).catch(() => null);
  if (!res) throw new Error('Couldn’t reach Fuelify. Check your connection.');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Kroger connection failed.');
  return body as T;
}

export interface KrogerLinkStatus {
  connected: boolean;
  /** Kroger is set up on the server */
  available: boolean;
}

export const krogerStatus = (supabase: TypedSupabaseClient) => call<KrogerLinkStatus>(supabase);

/** Go to Kroger to sign in; they come back to /kroger/callback, then to `returnTo`. */
export async function startKrogerLink(supabase: TypedSupabaseClient, returnTo: string): Promise<void> {
  const state = crypto.randomUUID();
  const { authorizeUrl } = await call<{ authorizeUrl?: string }>(supabase, { query: `?state=${state}` });
  if (!authorizeUrl) throw new Error('Kroger isn’t available right now.');
  try {
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(RETURN_KEY, returnTo);
  } catch {
    // Private mode: the callback can't verify state, and will say so
  }
  window.location.assign(authorizeUrl);
}

/** On /kroger/callback: check it's the sign-in we started, then save it. Returns where to go next. */
export async function finishKrogerLink(supabase: TypedSupabaseClient, params: URLSearchParams): Promise<string> {
  const error = params.get('error');
  if (error) throw new Error(error === 'access_denied' ? 'Kroger sign-in was cancelled.' : `Kroger sign-in failed (${error}).`);
  const code = params.get('code');
  const state = params.get('state');
  let expected: string | null = null;
  let back = '/cart?view=cart';
  try {
    expected = sessionStorage.getItem(STATE_KEY);
    back = sessionStorage.getItem(RETURN_KEY) || back;
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // fall through to the check below
  }
  if (!code) throw new Error('Kroger didn’t send a sign-in code.');
  if (!state || state !== expected) throw new Error('That Kroger sign-in didn’t start here. Try connecting again.');
  await call(supabase, { method: 'POST', body: JSON.stringify({ code }) });
  return back;
}

export const disconnectKroger = (supabase: TypedSupabaseClient) => call<KrogerLinkStatus>(supabase, { method: 'DELETE' });
