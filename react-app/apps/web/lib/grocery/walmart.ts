// Walmart Affiliate API (https://walmart.io): product search with prices, and
// Walmart's add-to-cart link to open a filled cart.
// Env: WALMART_CONSUMER_ID, WALMART_PRIVATE_KEY (PEM, the key registered with
// walmart.io), WALMART_KEY_VERSION (default "1"), optional WALMART_PUBLISHER_ID.

import { createSign } from 'node:crypto';
import { MAX_DEAL_RATIO, type ProductOffer } from '@fuelify/shared';
import { fetchJson, money, ProviderError, type GroceryProvider } from './provider';

const SEARCH = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search';
const STORE_BRANDS = /^(great value|marketside|sam'?s choice|freshness guaranteed|equate|bettergoods)/i;

/** Walmart signs requests with RSA-SHA256 over "consumerId\ntimestamp\nkeyVersion\n". */
function signedHeaders(): Record<string, string> {
  const consumerId = process.env.WALMART_CONSUMER_ID!;
  const keyVersion = process.env.WALMART_KEY_VERSION || '1';
  const timestamp = Date.now().toString();
  const signer = createSign('RSA-SHA256');
  signer.update(`${consumerId}\n${timestamp}\n${keyVersion}\n`);
  const key = process.env.WALMART_PRIVATE_KEY!.replace(/\\n/g, '\n');
  return {
    'WM_CONSUMER.ID': consumerId,
    'WM_CONSUMER.INTIMESTAMP': timestamp,
    'WM_SEC.KEY_VERSION': keyVersion,
    'WM_SEC.AUTH_SIGNATURE': signer.sign(key, 'base64'),
    Accept: 'application/json',
  };
}

interface WalmartItem {
  itemId: number;
  name: string;
  brandName?: string;
  size?: string;
  salePrice?: number;
  msrp?: number;
  mediumImage?: string;
  thumbnailImage?: string;
  productUrl?: string;
  productTrackingUrl?: string;
  stock?: string;
  availableOnline?: boolean;
}

export const walmart: GroceryProvider = {
  id: 'walmart',
  configured: () => !!(process.env.WALMART_CONSUMER_ID && process.env.WALMART_PRIVATE_KEY),

  async search(query) {
    const params = new URLSearchParams({ query: query.slice(0, 80), numItems: '5' });
    if (process.env.WALMART_PUBLISHER_ID) params.set('publisherId', process.env.WALMART_PUBLISHER_ID);
    const data = await fetchJson<{ items?: WalmartItem[] }>(`${SEARCH}?${params}`, { headers: signedHeaders() }, 'Walmart');
    return (data.items ?? []).flatMap((i): ProductOffer[] => {
      const sale = money(i.salePrice);
      // msrp is a list price that can be far from anything Walmart charges
      // (e.g. $1,400 on a $3 bottle); only count it as a deal when believable
      const listed = money(i.msrp);
      const regular = listed && sale && listed > sale * MAX_DEAL_RATIO ? null : listed;
      const price = regular && sale && regular > sale ? regular : sale ?? regular;
      if (!price) return [];
      return [{
        store: 'walmart',
        productId: String(i.itemId),
        name: i.name,
        brand: i.brandName ?? null,
        size: i.size ?? null,
        price,
        promoPrice: regular && sale && regular > sale ? sale : null,
        imageUrl: i.mediumImage ?? i.thumbnailImage ?? null,
        url: i.productTrackingUrl ?? i.productUrl ?? `https://www.walmart.com/ip/${i.itemId}`,
        inStock: i.stock ? /available/i.test(i.stock) && !/not/i.test(i.stock) : i.availableOnline !== false,
        organic: /organic/i.test(`${i.brandName} ${i.name}`),
        storeBrand: STORE_BRANDS.test(i.brandName ?? ''),
      }];
    });
  },

  async checkout(items) {
    // Walmart's add-to-cart link: items=ITEM_ID|QTY,ITEM_ID|QTY
    const list = items
      .filter((i) => i.productId && /^\d+$/.test(i.productId))
      .map((i) => `${i.productId}|${Math.max(1, Math.round(i.quantity))}`)
      .join(',');
    if (!list) throw new ProviderError('None of these items are from Walmart.');
    return `https://affil.walmart.com/cart/addToCart?items=${list}`;
  },
};
