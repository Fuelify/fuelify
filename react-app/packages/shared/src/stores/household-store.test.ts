import { describe, expect, it, vi } from 'vitest';
import { createHouseholdStore, selectActiveHousehold } from './household-store';
import { householdInviteErrorMessage, isOwner, sortMembers, type HouseholdMember } from '../models/household';
import type { HouseholdRepository } from '../supabase/household-repo';

const member = (userId: string, role: 'owner' | 'member', joinedAt = '2026-10-01'): HouseholdMember => ({
  id: `m-${userId}`, householdId: 'h1', userId, role, joinedAt, firstName: userId, lastName: null, imageUrl: null,
});

describe('household rules', () => {
  it('identifies owners', () => {
    const members = [member('ethan', 'owner'), member('teagan', 'member')];
    expect(isOwner(members, 'ethan')).toBe(true);
    expect(isOwner(members, 'teagan')).toBe(false);
    expect(isOwner(members, null)).toBe(false);
  });

  it('lists owners first, then by join date', () => {
    const sorted = sortMembers([member('b', 'member', '2026-10-03'), member('a', 'member', '2026-10-02'), member('o', 'owner', '2026-10-05')]);
    expect(sorted.map((m) => m.userId)).toEqual(['o', 'a', 'b']);
  });

  it('maps server error codes to friendly text', () => {
    expect(householdInviteErrorMessage('user_not_found')).toMatch(/No Fuelify account/);
    expect(householdInviteErrorMessage('already_member')).toMatch(/already in this household/);
    expect(householdInviteErrorMessage('not_household_owner')).toMatch(/Only the household owner/);
    expect(householdInviteErrorMessage('network down')).toBe('network down');
  });
});

function fakeRepo(overrides: Partial<Record<keyof HouseholdRepository, unknown>> = {}) {
  const households = [{ id: 'h1', name: 'Minier Household', plan: 'standard' as const, createdBy: 'ethan', createdAt: '', updatedAt: '' }];
  return {
    getMyHouseholds: vi.fn(async () => households),
    getMembers: vi.fn(async () => [member('ethan', 'owner')]),
    createHousehold: vi.fn(),
    addMemberByEmail: vi.fn(async () => member('teagan', 'member')),
    removeMember: vi.fn(async () => undefined),
    setPlan: vi.fn(async (id: string, plan: string) => ({ ...households[0], id, plan })),
    ...overrides,
  } as unknown as HouseholdRepository;
}

describe('household store', () => {
  it('adds a member by email and reports errors as messages', async () => {
    const repo = fakeRepo();
    const store = createHouseholdStore(repo, 'ethan');
    await store.getState().fetchHouseholds();
    expect(await store.getState().addMemberByEmail('teaganminier@gmail.com')).toBeNull();
    expect(store.getState().members.map((m) => m.userId)).toEqual(['ethan', 'teagan']);

    (repo.addMemberByEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('No Fuelify account uses that email yet.'));
    expect(await store.getState().addMemberByEmail('nobody@example.com')).toMatch(/No Fuelify account/);
    expect(store.getState().members).toHaveLength(2);
  });

  it('leaving removes the current user and lands on another household', async () => {
    const repo = fakeRepo();
    const store = createHouseholdStore(repo, 'teagan');
    await store.getState().fetchHouseholds();
    await store.getState().leaveHousehold();
    expect(repo.removeMember).toHaveBeenCalledWith('h1', 'teagan');
    expect(repo.getMyHouseholds).toHaveBeenCalledTimes(2);
  });

  it('switches the shared household plan and reports failures', async () => {
    const repo = fakeRepo();
    const store = createHouseholdStore(repo, 'ethan');
    await store.getState().fetchHouseholds();
    expect(selectActiveHousehold(store.getState())?.plan).toBe('standard');

    expect(await store.getState().setPlan('premium')).toBeNull();
    expect(repo.setPlan).toHaveBeenCalledWith('h1', 'premium');
    expect(selectActiveHousehold(store.getState())?.plan).toBe('premium');

    (repo.setPlan as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Only the household owner can change the plan.'));
    expect(await store.getState().setPlan('standard')).toMatch(/Only the household owner/);
    expect(selectActiveHousehold(store.getState())?.plan).toBe('premium');
  });
});
