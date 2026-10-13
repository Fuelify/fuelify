// Barcode → product (server only). Tries, in order: products people already
// identified (barcode_products), Open Food Facts, then Walmart and Kroger
// when they're connected. Grocery items missing from Open Food Facts are
// common in the US; the stores know almost every UPC they sell.

import { createClient } from '@supabase/supabase-js';
import { gtinForms, lookupBarcode, parsePackageSize, type ProductInfo } from '@fuelify/shared';
import { walmartByUpc } from './grocery/walmart';
import { krogerByProductId } from './grocery/kroger';

export type BarcodeSource = 'saved' | 'openfoodfacts' | 'walmart' | 'kroger';

export async function findProduct(code: string, userToken: string): Promise<{ product: ProductInfo; source: BarcodeSource } | null> {
  const forms = gtinForms(code);
  if (!forms) return null;

  // 1. Already identified (by anyone)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${userToken}` } },
  });
  const { data: saved } = await supabase.from('barcode_products').select('*').eq('barcode', forms.ean13).maybeSingle();
  if (saved) {
    return {
      source: 'saved',
      product: { barcode: forms.ean13, name: saved.name, brand: saved.brand ?? undefined, category: saved.category ?? undefined, imageUrl: saved.image_url ?? undefined, quantity: saved.quantity == null ? undefined : Number(saved.quantity), unit: saved.unit ?? undefined },
    };
  }

  // 2. Open Food Facts (as scanned, then the 13-digit form)
  for (const c of [...new Set([code, forms.ean13, forms.upcA].filter((x): x is string => !!x))]) {
    const off = await lookupBarcode(c, { signal: AbortSignal.timeout(6000) }).catch(() => null);
    if (off) return { product: { ...off, barcode: forms.ean13 }, source: 'openfoodfacts' };
  }

  // 3. The stores
  const fromStore = async (source: BarcodeSource, find: () => Promise<{ name: string; brand: string | null; size: string | null; imageUrl: string | null } | null>) => {
    const p = await find().catch(() => null);
    if (!p) return null;
    const size = parsePackageSize(p.size);
    return { source, product: { barcode: forms.ean13, name: p.name, brand: p.brand ?? undefined, imageUrl: p.imageUrl ?? undefined, ...size } };
  };
  return (
    (forms.upcA ? await fromStore('walmart', () => walmartByUpc(forms.upcA!)) : null) ??
    (await fromStore('kroger', () => krogerByProductId(forms.krogerId)))
  );
}
