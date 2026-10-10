// Household store — manages household membership and settings

import { createStore } from 'zustand/vanilla';
import type { HouseholdRepository } from '../supabase/household-repo';
import type { Household, HouseholdMember, HouseholdRole } from '../models/household';

export interface HouseholdState {
  households: Household[];
  activeHouseholdId: string | null;
  members: HouseholdMember[];
  isLoading: boolean;
  error: string | null;
}

export interface HouseholdActions {
  fetchHouseholds: () => Promise<void>;
  setActiveHousehold: (id: string) => void;
  createHousehold: (name: string) => Promise<Household>;
  /** Load households, create a default one if the user has none; resolves to the active household id. */
  ensureHousehold: () => Promise<string | null>;
  updateHousehold: (householdId: string, name: string) => Promise<void>;
  deleteHousehold: (householdId: string) => Promise<void>;
  fetchMembers: () => Promise<void>;
  addMember: (userId: string, role?: HouseholdRole) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  /** Owner adds an existing user by email. Resolves to an error message, or null on success. */
  addMemberByEmail: (email: string) => Promise<string | null>;
  /** Current user leaves the active household and switches to another (creating one if needed). */
  leaveHousehold: () => Promise<void>;
}

export type HouseholdStore = HouseholdState & HouseholdActions;

export const DEFAULT_HOUSEHOLD_NAME = 'My Household';

export function createHouseholdStore(repo: HouseholdRepository, userId: string) {
  // Shared so concurrent callers (e.g. Home + Pantry mounting) don't create two households
  let ensuring: Promise<string | null> | null = null;

  return createStore<HouseholdStore>()((set, get) => ({
    households: [],
    activeHouseholdId: null,
    members: [],
    isLoading: false,
    error: null,

    fetchHouseholds: async () => {
      set({ isLoading: true, error: null });
      try {
        const households = await repo.getMyHouseholds(userId);
        const current = get().activeHouseholdId;
        const activeId = households.find((h) => h.id === current)
          ? current
          : households[0]?.id ?? null;
        set({ households, activeHouseholdId: activeId, isLoading: false });
        // Auto-fetch members for the active household
        if (activeId) {
          const members = await repo.getMembers(activeId);
          set({ members });
        }
      } catch (err) {
        set({ isLoading: false, error: (err as Error).message });
      }
    },

    setActiveHousehold: (id: string) => {
      set({ activeHouseholdId: id, members: [] });
      // Fetch members for the newly selected household
      get().fetchMembers();
    },

    createHousehold: async (name: string) => {
      set({ error: null });
      try {
        const household = await repo.createHousehold(userId, name);
        set((state) => ({
          households: [...state.households, household],
          activeHouseholdId: household.id,
        }));
        // Fetch members (will include the creator as owner)
        const members = await repo.getMembers(household.id);
        set({ members });
        return household;
      } catch (err) {
        set({ error: (err as Error).message });
        throw err;
      }
    },

    ensureHousehold: () => {
      if (!ensuring) {
        ensuring = (async () => {
          await get().fetchHouseholds();
          if (get().households.length === 0 && !get().error) {
            await get().createHousehold(DEFAULT_HOUSEHOLD_NAME).catch(() => undefined);
          }
          return get().activeHouseholdId;
        })().finally(() => { ensuring = null; });
      }
      return ensuring;
    },

    updateHousehold: async (householdId: string, name: string) => {
      try {
        const updated = await repo.updateHousehold(householdId, name);
        set((state) => ({
          households: state.households.map((h) => (h.id === householdId ? updated : h)),
        }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    deleteHousehold: async (householdId: string) => {
      try {
        await repo.deleteHousehold(householdId);
        set((state) => {
          const remaining = state.households.filter((h) => h.id !== householdId);
          return {
            households: remaining,
            activeHouseholdId: remaining[0]?.id ?? null,
            members: state.activeHouseholdId === householdId ? [] : state.members,
          };
        });
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    fetchMembers: async () => {
      const hhId = get().activeHouseholdId;
      if (!hhId) return;
      try {
        const members = await repo.getMembers(hhId);
        set({ members });
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    addMember: async (memberUserId: string, role: HouseholdRole = 'member') => {
      const hhId = get().activeHouseholdId;
      if (!hhId) return;
      try {
        const member = await repo.addMember(hhId, memberUserId, role);
        set((state) => ({ members: [...state.members, member] }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    addMemberByEmail: async (email: string) => {
      const hhId = get().activeHouseholdId;
      if (!hhId) return 'No household selected.';
      try {
        const member = await repo.addMemberByEmail(hhId, email);
        set((state) => ({ members: [...state.members, member] }));
        return null;
      } catch (err) {
        return (err as Error).message;
      }
    },

    leaveHousehold: async () => {
      const hhId = get().activeHouseholdId;
      if (!hhId) return;
      try {
        await repo.removeMember(hhId, userId);
        set({ activeHouseholdId: null, members: [] });
        await get().ensureHousehold();
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    removeMember: async (memberUserId: string) => {
      const hhId = get().activeHouseholdId;
      if (!hhId) return;
      try {
        await repo.removeMember(hhId, memberUserId);
        set((state) => ({
          members: state.members.filter((m) => m.userId !== memberUserId),
        }));
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },
  }));
}
