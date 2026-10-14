// POST /api/grocery/checkout { store, items: [{ name, quantity, productId? }], config } → { url }
// Premium only. Returns a link that opens the items at the store.

import { GROCERY_STORES, readGroceryConfig, type CheckoutItem, type GroceryStoreId } from '@fuelify/shared';
import { PROVIDERS, ProviderError } from '@/lib/grocery';
import { KrogerLinkMissing } from '@/lib/grocery/kroger-cart';
import { premiumCaller } from '@/lib/grocery/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const caller = await premiumCaller(request);
  if (!caller.ok) return caller.response;

  const body = (await request.json().catch(() => null)) as { store?: unknown; items?: unknown; config?: unknown } | null;
  const store = GROCERY_STORES.find((s) => s === body?.store) as GroceryStoreId | undefined;
  const items = (Array.isArray(body?.items) ? body.items : [])
    .filter((i): i is CheckoutItem => typeof i?.name === 'string' && typeof i?.quantity === 'number')
    .slice(0, 200);
  if (!store || items.length === 0) return Response.json({ error: 'Nothing to check out.' }, { status: 400 });
  const provider = PROVIDERS[store];
  if (!provider.configured()) return Response.json({ error: `${store} isn’t connected yet.` }, { status: 409 });

  try {
    const userToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    return Response.json({ url: await provider.checkout(items, readGroceryConfig({ groceryConfig: body?.config }), { userId: caller.userId, userToken }) });
  } catch (err) {
    if (err instanceof KrogerLinkMissing) return Response.json({ error: err.message, needsKrogerLink: true }, { status: 409 });
    if (err instanceof ProviderError) return Response.json({ error: err.message }, { status: 422 });
    console.error(`${store} checkout failed`, err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
