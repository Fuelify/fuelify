// Prices people paid (price_observations) and community medians (community_prices RPC).

import type { TypedSupabaseClient } from './client';
import { priceKey, type CommunityPrice, type PriceObservation, type PriceObservationDraft } from '../models/price-book';
import type { Database } from './types';

type Row = Database['public']['Tables']['price_observations']['Row'];
const toObservation = (r: Row): PriceObservation => ({
  id: r.id,
  userId: r.user_id,
  householdId: r.household_id,
  storeKey: r.store_key,
  storeName: r.store_name,
  region: r.region,
  itemKey: r.item_key,
  itemName: r.item_name,
  productName: r.product_name,
  price: Number(r.price),
  quantity: Number(r.quantity),
  size: r.size,
  observedOn: r.observed_on,
  source: r.source as PriceObservation['source'],
  receiptId: r.receipt_id,
});

export class PriceBookRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  /** The household's prices from the last `days` days, newest first. */
  async household(householdId: string, days = 180): Promise<PriceObservation[]> {
    const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await this.supabase
      .from('price_observations')
      .select('*')
      .eq('household_id', householdId)
      .gte('observed_on', since)
      .order('observed_on', { ascending: false })
      .limit(3000);
    if (error) throw new Error(`Failed to load prices: ${error.message}`);
    return (data ?? []).map(toObservation);
  }

  async add(householdId: string, drafts: PriceObservationDraft[]): Promise<PriceObservation[]> {
    const rows = drafts
      .filter((d) => d.itemName.trim() && d.price > 0 && d.price < 1000)
      .map((d) => ({
        household_id: householdId,
        store_key: d.storeKey,
        store_name: d.storeName.slice(0, 80),
        region: d.region,
        item_key: priceKey(d.itemName).slice(0, 120) || d.itemName.toLowerCase().slice(0, 120),
        item_name: d.itemName.trim().slice(0, 120),
        product_name: d.productName?.slice(0, 160) ?? null,
        price: Math.round(d.price * 100) / 100,
        quantity: d.quantity && d.quantity > 0 ? d.quantity : 1,
        size: d.size?.slice(0, 40) ?? null,
        observed_on: d.observedOn,
        source: d.source,
        receipt_id: d.receiptId ?? null,
      }));
    if (rows.length === 0) return [];
    const { data, error } = await this.supabase.from('price_observations').insert(rows).select('*');
    if (error) throw new Error(`Failed to save prices: ${error.message}`);
    return (data ?? []).map(toObservation);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('price_observations').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete price: ${error.message}`);
  }

  async community(itemKeys: string[], region: string | null): Promise<CommunityPrice[]> {
    if (itemKeys.length === 0) return [];
    const { data, error } = await this.supabase.rpc('community_prices', { keys: itemKeys.slice(0, 200), zip3: region });
    if (error) throw new Error(`Failed to load community prices: ${error.message}`);
    return (data ?? []).map((r) => ({
      itemKey: r.item_key,
      storeKey: r.store_key,
      storeName: r.store_name,
      scope: r.scope === 'region' ? 'region' : 'national',
      medianPrice: Number(r.median_price),
      observations: r.observations,
      households: r.households,
      lastSeen: r.last_seen,
    }));
  }
}
