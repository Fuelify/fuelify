// Shopping cart store — shared cart items scoped to the active household

import { createStore } from 'zustand/vanilla';
import type { ShoppingCartRepository } from '../supabase/shopping-cart-repo';
import type { CartItem } from '../models/household';

export interface ShoppingCartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
}

export interface ShoppingCartActions {
  fetchItems: (householdId: string) => Promise<void>;
  addItem: (householdId: string, item: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    recipeId?: string;
    notes?: string;
  }) => Promise<void>;
  updateItem: (itemId: string, updates: {
    name?: string;
    quantity?: number;
    unit?: string | null;
    category?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  clearChecked: (householdId: string) => Promise<void>;
  clearAll: (householdId: string) => Promise<void>;
}

export type ShoppingCartStore = ShoppingCartState & ShoppingCartActions;

export function createShoppingCartStore(repo: ShoppingCartRepository, userId: string) {
  return createStore<ShoppingCartStore>()((set, get) => ({
    items: [],
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

    addItem: async (householdId: string, item) => {
      try {
        const newItem = await repo.addItem(householdId, userId, item);
        set((state) => ({ items: [...state.items, newItem] }));
      } catch (err) {
        set({ error: (err as Error).message });
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

    toggleItem: async (itemId: string) => {
      const item = get().items.find((i) => i.id === itemId);
      if (!item) return;
      const newChecked = !item.checked;
      // Optimistic update
      set((state) => ({
        items: state.items.map((i) =>
          i.id === itemId ? { ...i, checked: newChecked } : i,
        ),
      }));
      try {
        await repo.toggleItem(itemId, newChecked);
      } catch (err) {
        // Revert on failure
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, checked: !newChecked } : i,
          ),
          error: (err as Error).message,
        }));
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

    clearChecked: async (householdId: string) => {
      try {
        await repo.clearChecked(householdId);
        set((state) => ({ items: state.items.filter((i) => !i.checked) }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    clearAll: async (householdId: string) => {
      try {
        await repo.clearAll(householdId);
        set({ items: [] });
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },
  }));
}
