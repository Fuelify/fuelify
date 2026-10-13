// Barcode → product (server only). Asks every source at once: products
// people already identified (barcode_products), Open Food Facts, and Walmart
// and Kroger when connected, then combines them (see mergeProductInfo).
// Grocery items missing from Open Food Facts are common in the US; the stores
// know almost every UPC they sell and have proper product photos.

import { createClient } from '@supabase/supabase-js';
import { guessCategoryAndZone, gtinForms, lookupBarcode, mergeProductInfo, parsePackageSize, type ProductInfo, type ProductSource } from '@fuelify/shared';
import { walmartByUpc } from './grocery/walmart';
import { krogerByProductId } from './grocery/kroger';

export type BarcodeSource = ProductSource;

type StoreProduct = { name: string; brand: string | null; size: string | null; imageUrl: string | null } | null;
const fromStore = (p: StoreProduct): Partial<ProductInfo> | null =>
  p ? { name: p.name, brand: p.brand ?? undefined, imageUrl: p.imageUrl ?? undefined, ...parsePackageSize(p.size) } : null;

/**
 * Everything every source knows about a barcode, combined field by field:
 * Open Food Facts often lacks photos, brands or sizes, so the connected stores
 * are always asked too (all at once, so it's no slower).
 */
export async function findProduct(code: string, userToken: string): Promise<{ product: ProductInfo; source: BarcodeSource; sources: BarcodeSource[] } | null> {
  const forms = gtinForms(code);
  if (!forms) return null;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${userToken}` } },
  });

  const saved = async (): Promise<Partial<ProductInfo> | null> => {
    const { data } = await supabase.from('barcode_products').select('*').eq('barcode', forms.ean13).maybeSingle();
    return data
      ? { name: data.name, brand: data.brand ?? undefined, category: data.category ?? undefined, imageUrl: data.image_url ?? undefined, quantity: data.quantity == null ? undefined : Number(data.quantity), unit: data.unit ?? undefined }
      : null;
  };
  const off = async (): Promise<Partial<ProductInfo> | null> => {
    // As scanned, then the 13- and 12-digit forms
    for (const c of [...new Set([code, forms.ean13, forms.upcA].filter((x): x is string => !!x))]) {
      const hit = await lookupBarcode(c, { signal: AbortSignal.timeout(6000) }).catch(() => null);
      if (hit) return hit;
    }
    return null;
  };

  const [s, o, w, k] = await Promise.all([
    saved().catch(() => null),
    off(),
    forms.upcA ? walmartByUpc(forms.upcA).then(fromStore).catch(() => null) : Promise.resolve(null),
    krogerByProductId(forms.krogerId).then(fromStore).catch(() => null),
  ]);
  const merged = mergeProductInfo(forms.ean13, { saved: s, openfoodfacts: o, walmart: w, kroger: k });
  if (!merged) return null;
  const product = { ...merged.product, category: merged.product.category ?? guessCategoryAndZone(merged.product.name).category };
  return { product, source: merged.sources[0], sources: merged.sources };
}
