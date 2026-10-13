// Client side of barcode lookups: ask our server (which checks saved
// products, Open Food Facts and the connected stores), and remember what
// people name products nobody had identified.

import { gtinForms, type ProductInfo, type TypedSupabaseClient } from '@fuelify/shared';

export async function findBarcode(supabase: TypedSupabaseClient, code: string): Promise<ProductInfo | null> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
  }).catch(() => null);
  if (!res) throw new Error('Couldn’t reach Fuelify. Check your connection.');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Barcode lookup failed.');
  return body.product ?? null;
}

/** Save a product someone identified by hand, so the next scan finds it. Best effort. */
export async function rememberBarcode(
  supabase: TypedSupabaseClient,
  userId: string | null,
  code: string,
  item: { name: string; brand?: string | null; category?: string | null; quantity?: number | null; unit?: string | null },
): Promise<void> {
  const forms = gtinForms(code);
  if (!forms || !userId || !item.name.trim()) return;
  await supabase.from('barcode_products').insert({
    barcode: forms.ean13,
    name: item.name.trim().slice(0, 200),
    brand: item.brand?.trim() || null,
    category: item.category || null,
    quantity: item.quantity ?? null,
    unit: item.unit || null,
    source: 'user',
    added_by: userId,
  });
}
