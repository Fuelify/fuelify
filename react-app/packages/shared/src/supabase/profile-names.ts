// Display names for other users (who added a cart/pantry item, household members).
//
// Rows reference auth.users, not profiles, so PostgREST can't embed
// `profiles(...)` in the same query. Instead we load the referenced profiles
// in one extra query and merge them in. Profiles the caller isn't allowed to
// read (RLS) simply come back without a name.

import type { TypedSupabaseClient } from './client';

export interface DisplayProfile {
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

export function displayName(p: Pick<DisplayProfile, 'firstName' | 'lastName'> | undefined): string | null {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || null;
}

/** Profiles for the given user ids, keyed by id. */
export async function fetchDisplayProfiles(supabase: TypedSupabaseClient, userIds: string[]): Promise<Map<string, DisplayProfile>> {
  const ids = [...new Set(userIds)].filter(Boolean);
  const result = new Map<string, DisplayProfile>();
  if (ids.length === 0) return result;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, image_url')
    .in('id', ids);
  // Names are decoration — never fail the caller's main query over them
  if (error) return result;

  for (const row of data ?? []) {
    result.set(row.id, { firstName: row.first_name, lastName: row.last_name, imageUrl: row.image_url });
  }
  return result;
}

/** Fill `addedByName` on items from the profile of whoever added them. */
export async function withAddedByNames<T extends { addedBy: string; addedByName?: string | null }>(
  supabase: TypedSupabaseClient,
  items: T[],
): Promise<T[]> {
  const profiles = await fetchDisplayProfiles(supabase, items.map((i) => i.addedBy));
  return items.map((i) => ({ ...i, addedByName: displayName(profiles.get(i.addedBy)) }));
}
