// POST /api/grocery/search { queries: [{ key, query }], config } → { offers: { [key]: ProductOffer[] }, errors }
// Premium only. Searches every enabled, connected store that has prices.

import { GROCERY_STORE_INFO, readGroceryConfig, type ProductOffer } from '@fuelify/shared';
import { PROVIDERS, ProviderError } from '@/lib/grocery';
import { premiumCaller } from '@/lib/grocery/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Each request prices up to 20 items at each store
export const maxDuration = 30;

const MAX_QUERIES = 60;
const CONCURRENCY = 6;

/** Run tasks a few at a time (store APIs rate-limit). */
async function pooled<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }));
  return results;
}

export async function POST(request: Request) {
  const caller = await premiumCaller(request);
  if (!caller.ok) return caller.response;

  const body = (await request.json().catch(() => null)) as { queries?: unknown; config?: unknown } | null;
  const queries = (Array.isArray(body?.queries) ? body.queries : [])
    .filter((q): q is { key: string; query: string } => typeof q?.key === 'string' && typeof q?.query === 'string' && q.query.trim().length > 0)
    .slice(0, MAX_QUERIES);
  if (queries.length === 0) return Response.json({ error: 'Nothing to search for.' }, { status: 400 });
  const config = readGroceryConfig({ groceryConfig: body?.config });

  const providers = config.stores.map((s) => PROVIDERS[s]).filter((p) => GROCERY_STORE_INFO[p.id].prices && p.configured());
  if (providers.length === 0) {
    return Response.json({ error: 'None of your stores are connected yet. Check Profile → Grocery stores.' }, { status: 409 });
  }

  const offers: Record<string, ProductOffer[]> = {};
  const errors: Record<string, string> = {};
  const tasks = queries.flatMap((q) =>
    providers.map((p) => async () => {
      try {
        const found = await p.search(q.query, config);
        offers[q.key] = [...(offers[q.key] ?? []), ...found];
      } catch (err) {
        errors[p.id] = err instanceof ProviderError ? err.message : 'Something went wrong.';
        if (!(err instanceof ProviderError)) console.error(`${p.id} search failed`, err);
      }
    }),
  );
  await pooled(tasks, CONCURRENCY);
  return Response.json({ offers, errors });
}
