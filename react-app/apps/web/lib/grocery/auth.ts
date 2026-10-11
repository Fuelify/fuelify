// Who's calling a grocery route, and are they on Premium (household plan)?

import { createClient } from '@supabase/supabase-js';

export type GroceryCaller = { ok: true; userId: string } | { ok: false; response: Response };

export async function premiumCaller(request: Request): Promise<GroceryCaller> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return { ok: false, response: Response.json({ error: 'Sign in to use store connections.' }, { status: 401 }) };
  // Query as the user so row-level security limits it to their households
  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: user } = await supabase.auth.getUser(token);
  if (!user.user) return { ok: false, response: Response.json({ error: 'Sign in to use store connections.' }, { status: 401 }) };
  const { data: premium } = await supabase.from('households').select('id').eq('plan', 'premium').limit(1);
  if (!premium?.length) return { ok: false, response: Response.json({ error: 'Store connections are a Premium feature.' }, { status: 403 }) };
  return { ok: true, userId: user.user.id };
}
