// The household's price book: their own prices plus community medians for the
// items they look at. `points` is the best known price per item and store.

import { createStore } from 'zustand/vanilla';
import { priceKey, pricePoints, type CommunityPrice, type PriceObservation, type PriceObservationDraft, type PricePoint } from '../models/price-book';
import type { PriceBookRepository } from '../supabase/price-book-repo';

export interface PriceBookState {
  householdId: string | null;
  /** First 3 digits of the household ZIP, for nearby prices */
  region: string | null;
  own: PriceObservation[];
  community: CommunityPrice[];
  points: PricePoint[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export interface PriceBookActions {
  load: (householdId: string, region: string | null) => Promise<void>;
  /** Fetch community prices for items not asked about yet. */
  loadCommunity: (itemNames: string[]) => Promise<void>;
  /** Save prices; resolves to how many were saved. */
  record: (drafts: PriceObservationDraft[]) => Promise<number>;
  remove: (id: string) => Promise<void>;
}

export type PriceBookStore = PriceBookState & PriceBookActions;

export function createPriceBookStore(repo: Pick<PriceBookRepository, 'household' | 'add' | 'remove' | 'community'>) {
  let asked = new Set<string>();
  return createStore<PriceBookStore>()((set, get) => {
    const refresh = (patch: Partial<PriceBookState>) => {
      const next = { ...get(), ...patch };
      set({ ...patch, points: pricePoints(next.own, next.community) });
    };
    return {
      householdId: null,
      region: null,
      own: [],
      community: [],
      points: [],
      loading: false,
      saving: false,
      error: null,

      load: async (householdId, region) => {
        if (get().householdId !== householdId || get().region !== region) {
          asked = new Set();
          refresh({ householdId, region, own: [], community: [] });
        }
        set({ loading: true, error: null });
        try {
          const own = await repo.household(householdId);
          if (get().householdId !== householdId) return;
          refresh({ own, loading: false });
          await get().loadCommunity(own.map((o) => o.itemName));
        } catch (err) {
          set({ loading: false, error: (err as Error).message });
        }
      },

      loadCommunity: async (itemNames) => {
        const keys = [...new Set(itemNames.map(priceKey).filter(Boolean))].filter((k) => !asked.has(k));
        if (keys.length === 0) return;
        keys.forEach((k) => asked.add(k));
        const householdId = get().householdId;
        try {
          const found = await repo.community(keys, get().region);
          if (get().householdId !== householdId) return;
          refresh({ community: [...get().community.filter((c) => !keys.includes(c.itemKey)), ...found] });
        } catch {
          // Community prices are a bonus; the household's own still show
          keys.forEach((k) => asked.delete(k));
        }
      },

      record: async (drafts) => {
        const householdId = get().householdId;
        if (!householdId || drafts.length === 0) return 0;
        set({ saving: true, error: null });
        try {
          const added = await repo.add(householdId, drafts);
          refresh({ own: [...added, ...get().own], saving: false });
          return added.length;
        } catch (err) {
          set({ saving: false, error: (err as Error).message });
          return 0;
        }
      },

      remove: async (id) => {
        const before = get().own;
        refresh({ own: before.filter((o) => o.id !== id) });
        try {
          await repo.remove(id);
        } catch (err) {
          refresh({ own: before });
          set({ error: (err as Error).message });
        }
      },
    };
  });
}
