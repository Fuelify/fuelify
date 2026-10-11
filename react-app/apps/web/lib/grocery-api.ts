// The web app's GroceryApi: calls this app's server routes (which hold the
// store credentials) with the signed-in user's token.

import type { GroceryApi, GroceryProviderStatus, ProductOffer, TypedSupabaseClient } from '@fuelify/shared';

export function createWebGroceryApi(supabase: TypedSupabaseClient): GroceryApi {
  const call = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}`, ...init?.headers },
    }).catch(() => null);
    if (!res) throw new Error('Couldn’t reach Fuelify. Check your connection.');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? 'Something went wrong.');
    return body as T;
  };

  return {
    status: () => call<GroceryProviderStatus>('/api/grocery/status'),
    async search(queries, config) {
      const { offers, errors } = await call<{ offers: Record<string, ProductOffer[]>; errors: Record<string, string> }>('/api/grocery/search', {
        method: 'POST',
        body: JSON.stringify({ queries, config }),
      });
      // Every store failed: say why rather than showing an empty result
      const problems = Object.values(errors ?? {});
      if (Object.keys(offers).length === 0 && problems.length) throw new Error(problems[0]);
      return offers;
    },
    async checkout(store, items, config) {
      const { url } = await call<{ url: string }>('/api/grocery/checkout', { method: 'POST', body: JSON.stringify({ store, items, config }) });
      return url;
    },
  };
}
