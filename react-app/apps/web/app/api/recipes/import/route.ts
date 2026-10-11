// POST /api/recipes/import { url } → { recipe } | { error, partial? }
//
// Fetches a recipe page server-side (browsers can't read other sites) and
// parses it with the shared importer. Signed-in users only, public web
// addresses only, small pages only — this must not become an open proxy.

import { createClient } from '@supabase/supabase-js';
import { parseRecipeHtml, recipeUrlError } from '@fuelify/shared';
import { fetchRecipePage, ImportError } from '@/lib/fetch-recipe-page';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function signedInUser(request: Request): Promise<string | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return null;
  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function POST(request: Request) {
  if (!(await signedInUser(request))) return json({ error: 'Sign in to import recipes.' }, 401);

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const input = typeof body?.url === 'string' ? body.url.trim() : '';
  const problem = recipeUrlError(input);
  if (problem) return json({ error: problem }, 400);

  try {
    const { html, finalUrl } = await fetchRecipePage(input);
    const result = parseRecipeHtml(html, finalUrl);
    if (result.ok) return json({ recipe: result.recipe });
    return json(
      { error: 'We couldn’t find recipe details on that page. Try pasting the recipe text instead.', partial: result.partial },
      422,
    );
  } catch (err) {
    if (err instanceof ImportError) return json({ error: err.message }, 422);
    console.error('recipe import failed', err);
    return json({ error: 'Something went wrong importing that recipe.' }, 500);
  }
}
