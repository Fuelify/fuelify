// Kroger Public API (https://developer.kroger.com): product search with local
// prices and promos at the store nearest the user's ZIP code.
// Env: KROGER_CLIENT_ID, KROGER_CLIENT_SECRET (app with the product.compact scope).
//
// Checkout adds the chosen products to the person's own Kroger cart, once
// they've connected their Kroger account (see kroger-cart.ts).

import type { ProductOffer } from '@fuelify/shared';
import { fetchJson, money, ProviderError, type GroceryProvider } from './provider';
import { addToKrogerCart, userClient } from './kroger-cart';

const API = 'https://api.kroger.com/v1';
const STORE_BRANDS = /^(kroger|simple truth|private selection|heritage farm|psst|comforts)/i;

let token: { value: string; expires: number } | null = null;
const locationsByZip = new Map<string, string | null>();

async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const basic = Buffer.from(`${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`).toString('base64');
  const data = await fetchJson<{ access_token: string; expires_in: number }>(
    `${API}/connect/oauth2/token`,
    { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials&scope=product.compact' },
    'Kroger',
  );
  token = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return token.value;
}

async function nearestLocation(zip: string): Promise<string | null> {
  if (locationsByZip.has(zip)) return locationsByZip.get(zip)!;
  const data = await fetchJson<{ data: { locationId: string }[] }>(
    `${API}/locations?filter.zipCode.near=${encodeURIComponent(zip)}&filter.limit=1`,
    { headers: { Authorization: `Bearer ${await accessToken()}`, Accept: 'application/json' } },
    'Kroger',
  );
  const id = data.data?.[0]?.locationId ?? null;
  locationsByZip.set(zip, id);
  return id;
}

interface KrogerProduct {
  productId: string;
  description: string;
  brand?: string;
  productPageURI?: string;
  images?: { perspective: string; sizes: { size: string; url: string }[] }[];
  items?: { price?: { regular?: number; promo?: number }; size?: string; inventory?: { stockLevel?: string } }[];
}

/** Identify a product by Kroger's product id (13-digit UPC without check digit), for barcode scans. */
export async function krogerByProductId(id: string): Promise<{ name: string; brand: string | null; size: string | null; imageUrl: string | null } | null> {
  if (!kroger.configured()) return null;
  const data = await fetchJson<{ data?: KrogerProduct }>(
    `${API}/products/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${await accessToken()}`, Accept: 'application/json' } },
    'Kroger',
  ).catch(() => null);
  const p = data?.data;
  if (!p?.description) return null;
  const front = p.images?.find((x) => x.perspective === 'front') ?? p.images?.[0];
  return { name: p.description, brand: p.brand ?? null, size: p.items?.[0]?.size ?? null, imageUrl: front?.sizes.find((s) => s.size === 'medium')?.url ?? front?.sizes[0]?.url ?? null };
}

export const kroger: GroceryProvider = {
  id: 'kroger',
  configured: () => !!(process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET),

  async search(query, config) {
    if (!config.zipCode) throw new ProviderError('Set your household’s location (Household → location) to get Kroger prices near you.');
    const locationId = await nearestLocation(config.zipCode);
    if (!locationId) return [];
    const data = await fetchJson<{ data: KrogerProduct[] }>(
      `${API}/products?filter.term=${encodeURIComponent(query.slice(0, 80))}&filter.locationId=${locationId}&filter.limit=5`,
      { headers: { Authorization: `Bearer ${await accessToken()}`, Accept: 'application/json' } },
      'Kroger',
    );
    return (data.data ?? []).flatMap((p): ProductOffer[] => {
      const item = p.items?.[0];
      const price = money(item?.price?.regular);
      if (!price) return []; // not sold at this store
      const front = p.images?.find((i) => i.perspective === 'front') ?? p.images?.[0];
      return [{
        store: 'kroger',
        productId: p.productId,
        name: p.description,
        brand: p.brand ?? null,
        size: item?.size ?? null,
        price,
        promoPrice: money(item?.price?.promo),
        imageUrl: front?.sizes.find((s) => s.size === 'medium')?.url ?? front?.sizes[0]?.url ?? null,
        url: p.productPageURI ? `https://www.kroger.com${p.productPageURI}` : `https://www.kroger.com/p/${p.productId}`,
        inStock: item?.inventory?.stockLevel !== 'TEMPORARILY_OUT_OF_STOCK',
        organic: /organic/i.test(`${p.brand} ${p.description}`),
        storeBrand: STORE_BRANDS.test(p.brand ?? ''),
      }];
    });
  },

  /** Adds the items to the person's own Kroger cart (they connect their Kroger account once), then opens it. */
  async checkout(items, _config, who) {
    const upcs = items.filter((i) => i.productId && /^\d{13}$/.test(i.productId)).map((i) => ({ upc: i.productId!, quantity: i.quantity }));
    await addToKrogerCart(userClient(who.userToken), who.userId, upcs);
    return 'https://www.kroger.com/cart';
  },
};
