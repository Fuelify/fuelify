// Is a request from a signed-in Fuelify user? For API routes that cost us
// something (third-party lookups) but aren't plan-gated.

import { createClient } from '@supabase/supabase-js';

export async function signedInUser(request: Request): Promise<string | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;
  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
}
