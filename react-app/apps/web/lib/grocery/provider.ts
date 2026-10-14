// Server-only grocery store adapters. Each store's credentials come from
// environment variables; a store without them reports "not connected".

import type { GroceryConfig, GroceryStoreId, ProductOffer } from '@fuelify/shared';
import type { CheckoutItem } from '@fuelify/shared';

export interface GroceryProvider {
  id: GroceryStoreId;
  /** Credentials present? */
  configured: () => boolean;
  /** Offers for one query; empty when the store can't price (Instacart). */
  search: (query: string, config: GroceryConfig) => Promise<ProductOffer[]>;
  /** URL that opens these items at the store (after adding them to the person's cart, where the store allows) */
  checkout: (items: CheckoutItem[], config: GroceryConfig, who: CheckoutCaller) => Promise<string>;
}

/** The signed-in person checking out (for stores that add to their own account's cart). */
export interface CheckoutCaller {
  userId: string;
  userToken: string;
}

export class ProviderError extends Error {}

const TIMEOUT_MS = 10_000;

/** fetch with a timeout and a readable error. */
export async function fetchJson<T>(url: string, init: RequestInit, store: string): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((err: Error) => {
    throw new ProviderError(`${store} didn’t respond (${err.name === 'TimeoutError' ? 'timed out' : 'network error'}).`);
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`${store} API ${res.status}: ${body.slice(0, 300)}`);
    throw new ProviderError(`${store} returned an error (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

export const money = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[^0-9.]/g, '')) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
