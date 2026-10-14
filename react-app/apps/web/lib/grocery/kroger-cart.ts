// Kroger account link (OAuth authorization code) and "add to my Kroger cart"
// (server only). Tokens are stored per person in kroger_links, encrypted with
// AES-256-GCM using a key derived from KROGER_CLIENT_SECRET, and read/written
// with the person's own Supabase session (RLS: own row only).
//
// Kroger app setup: scope cart.basic:write; redirect URI
// https://fuelifyapp.vercel.app/kroger/callback (or set KROGER_REDIRECT_URI).

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { TypedSupabaseClient } from '@fuelify/shared';
import { fetchJson, ProviderError } from './provider';

const API = 'https://api.kroger.com/v1';
const SCOPE = 'cart.basic:write';

interface Tokens {
  access: string;
  refresh: string;
  /** ms since epoch */
  expiresAt: number;
}

export class KrogerLinkMissing extends ProviderError {}

function key(): Buffer {
  const secret = process.env.KROGER_CLIENT_SECRET;
  if (!secret) throw new ProviderError('Kroger isn’t connected on the server.');
  return Buffer.from(hkdfSync('sha256', secret, 'fuelify', 'kroger-user-tokens', 32));
}

function seal(t: Tokens): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(t), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

function open(sealed: string): Tokens | null {
  try {
    const raw = Buffer.from(sealed, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')) as Tokens;
  } catch {
    // Secret rotated or tampered: the person reconnects
    return null;
  }
}

export function redirectUri(request: Request): string {
  return process.env.KROGER_REDIRECT_URI || `${new URL(request.url).origin}/kroger/callback`;
}

export function authorizeUrl(redirect: string, state: string): string {
  const params = new URLSearchParams({ scope: SCOPE, response_type: 'code', client_id: process.env.KROGER_CLIENT_ID ?? '', redirect_uri: redirect, state });
  return `${API}/connect/oauth2/authorize?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  const basic = Buffer.from(`${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`).toString('base64');
  const data = await fetchJson<{ access_token: string; refresh_token: string; expires_in: number }>(
    `${API}/connect/oauth2/token`,
    { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() },
    'Kroger',
  );
  return { access: data.access_token, refresh: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000 };
}

/** The person's Supabase client (their RLS applies). */
export function userClient(userToken: string): TypedSupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${userToken}` } },
  }) as unknown as TypedSupabaseClient;
}

export async function connect(db: TypedSupabaseClient, userId: string, code: string, redirect: string): Promise<void> {
  const tokens = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirect });
  const { error } = await db.from('kroger_links').upsert({ user_id: userId, token_enc: seal(tokens) }, { onConflict: 'user_id' });
  if (error) throw new ProviderError('Couldn’t save your Kroger connection.');
}

export async function isLinked(db: TypedSupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from('kroger_links').select('token_enc').eq('user_id', userId).maybeSingle();
  return !!data && !!open(data.token_enc);
}

export async function disconnect(db: TypedSupabaseClient, userId: string): Promise<void> {
  await db.from('kroger_links').delete().eq('user_id', userId);
}

/** A working access token for the person, refreshing (and saving) it when it's about to expire. */
async function accessFor(db: TypedSupabaseClient, userId: string): Promise<string> {
  const { data } = await db.from('kroger_links').select('token_enc').eq('user_id', userId).maybeSingle();
  const tokens = data ? open(data.token_enc) : null;
  if (!tokens) throw new KrogerLinkMissing('Connect your Kroger account first (Household → Grocery stores).');
  if (tokens.expiresAt > Date.now() + 60_000) return tokens.access;
  const fresh = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refresh }).catch(() => null);
  if (!fresh) {
    await disconnect(db, userId);
    throw new KrogerLinkMissing('Your Kroger sign-in expired. Connect your Kroger account again.');
  }
  await db.from('kroger_links').update({ token_enc: seal({ ...fresh, refresh: fresh.refresh || tokens.refresh }) }).eq('user_id', userId);
  return fresh.access;
}

/** Add products (Kroger product ids = UPCs) to the person's Kroger cart. */
export async function addToKrogerCart(db: TypedSupabaseClient, userId: string, items: { upc: string; quantity: number }[]): Promise<void> {
  if (items.length === 0) throw new ProviderError('None of these items are Kroger products. Pick Kroger products for them first.');
  const access = await accessFor(db, userId);
  const res = await fetch(`${API}/cart/add`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ items: items.slice(0, 100).map((i) => ({ upc: i.upc, quantity: Math.max(1, Math.round(i.quantity)) })) }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res) throw new ProviderError('Kroger didn’t respond. Try again.');
  if (res.status === 401) {
    await disconnect(db, userId);
    throw new KrogerLinkMissing('Your Kroger sign-in expired. Connect your Kroger account again.');
  }
  if (!res.ok) {
    console.error('Kroger cart add', res.status, (await res.text().catch(() => '')).slice(0, 300));
    throw new ProviderError(`Kroger couldn’t add the items (${res.status}).`);
  }
}
