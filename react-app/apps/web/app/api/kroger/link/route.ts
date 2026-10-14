// Kroger account link for the signed-in person.
// GET    → { connected, authorizeUrl } (state is created by the client)
// POST   { code } → exchange the sign-in code and save (encrypted)
// DELETE → disconnect

import { authorizeUrl, connect, disconnect, isLinked, redirectUri, userClient } from '@/lib/grocery/kroger-cart';
import { kroger } from '@/lib/grocery/kroger';
import { ProviderError } from '@/lib/grocery/provider';
import { signedInUser } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function caller(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const userId = token ? await signedInUser(request) : null;
  return userId && token ? { userId, db: userClient(token) } : null;
}

export async function GET(request: Request) {
  const c = await caller(request);
  if (!c) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!kroger.configured()) return Response.json({ connected: false, available: false });
  const state = new URL(request.url).searchParams.get('state') ?? '';
  return Response.json({ connected: await isLinked(c.db, c.userId), available: true, authorizeUrl: authorizeUrl(redirectUri(request), state) });
}

export async function POST(request: Request) {
  const c = await caller(request);
  if (!c) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (typeof body?.code !== 'string' || !body.code) return Response.json({ error: 'Missing sign-in code.' }, { status: 400 });
  try {
    await connect(c.db, c.userId, body.code, redirectUri(request));
    return Response.json({ connected: true });
  } catch (err) {
    const message = err instanceof ProviderError ? err.message : 'Couldn’t connect to Kroger.';
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const c = await caller(request);
  if (!c) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  await disconnect(c.db, c.userId);
  return Response.json({ connected: false });
}
