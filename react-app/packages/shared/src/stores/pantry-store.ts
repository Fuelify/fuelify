// Pantry store — manages pantry items scoped to the active household

import { createStore } from 'zustand/vanilla';
import type { PantryRepository } from '../supabase/pantry-repo';
import type { PantryItem, StorageZone, ItemStatus } from '../models/pantry';
import type { PantryItemDraft } from '../models/external-data';

export interface PantryState {
  items: PantryItem[];
  activeZone: StorageZone | 'all';
  isLoading: boolean;
  error: string | null;
}

export interface PantryActions {
  fetchItems: (householdId: string) => Promise<void>;
  setActiveZone: (zone: StorageZone | 'all') => void;
  addItem: (householdId: string, item: PantryItemDraft) => Promise<void>;
  addItems: (householdId: string, items: PantryItemDraft[]) => Promise<PantryItem[]>;
  updateItem: (itemId: string, updates: {
    name?: string;
    brand?: string | null;
    category?: string | null;
    storageZone?: StorageZone;
    quantity?: number;
    unit?: string | null;
    remainingPct?: number;
    status?: ItemStatus;
    purchaseDate?: string | null;
    expirationDate?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  markOpen: (itemId: string, remainingPct?: number) => Promise<void>;
  markExpired: (itemId: string) => Promise<void>;
  clearExpired: (householdId: string) => Promise<void>;
  getFilteredItems: () => PantryItem[];
}

export type PantryStore = PantryState & PantryActions;

export function createPantryStore(repo: PantryRepository, userId: string) {
  return createStore<PantryStore>()((set, get) => ({
    items: [],
    activeZone: 'all',
    isLoading: false,
    error: null,

    fetchItems: async (householdId: string) => {
      set({ isLoading: true, error: null });
      try {
        const items = await repo.getItems(householdId);
        set({ items, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    setActiveZone: (zone: StorageZone | 'all') => set({ activeZone: zone }),

    addItem: async (householdId: string, item) => {
      try {
        const newItem = await repo.addItem(householdId, userId, item);
        set((state) => ({ items: [...state.items, newItem] }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    addItems: async (householdId: string, items) => {
      try {
        const newItems = await repo.addItems(householdId, userId, items);
        set((state) => ({ items: [...state.items, ...newItems] }));
        return newItems;
      } catch (err) {
        set({ error: (err as Error).message });
        return [];
      }
    },

    updateItem: async (itemId: string, updates) => {
      try {
        const updated = await repo.updateItem(itemId, updates);
        set((state) => ({
          items: state.items.map((i) => (i.id === itemId ? updated : i)),
        }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    deleteItem: async (itemId: string) => {
      const prev = get().items;
      set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
      try {
        await repo.deleteItem(itemId);
      } catch (err) {
        set({ items: prev, error: (err as Error).message });
      }
    },

    markOpen: async (itemId: string, remainingPct = 75) => {
      try {
        const updated = await repo.updateItem(itemId, {
          status: 'open',
          remainingPct,
        });
        set((state) => ({
          items: state.items.map((i) => (i.id === itemId ? updated : i)),
        }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    markExpired: async (itemId: string) => {
      try {
        const updated = await repo.updateItem(itemId, { status: 'expired' });
        set((state) => ({
          items: state.items.map((i) => (i.id === itemId ? updated : i)),
        }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    clearExpired: async (householdId: string) => {
      try {
        await repo.clearExpired(householdId);
        set((state) => ({
          items: state.items.filter((i) => i.status !== 'expired'),
        }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    getFilteredItems: () => {
      const { items, activeZone } = get();
      if (activeZone === 'all') return items;
      return items.filter((i) => i.storageZone === activeZone);
    },
  }));
}
