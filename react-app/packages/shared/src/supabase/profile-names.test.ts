import { describe, expect, it } from 'vitest';
import { displayName, withAddedByNames } from './profile-names';
import type { TypedSupabaseClient } from './client';

function fakeProfiles(rows: { id: string; first_name: string | null; last_name: string | null }[], fail = false) {
  const queried: string[][] = [];
  const builder = {
    select: () => builder,
    in: (_col: string, ids: string[]) => {
      queried.push(ids);
      return Promise.resolve(fail
        ? { data: null, error: { message: 'boom' } }
        : { data: rows.filter((r) => ids.includes(r.id)).map((r) => ({ ...r, image_url: null })), error: null });
    },
  };
  return { client: { from: () => builder } as unknown as TypedSupabaseClient, queried };
}

describe('profile names', () => {
  it('fills addedByName with one query for all distinct users', async () => {
    const { client, queried } = fakeProfiles([{ id: 'e', first_name: 'Ethan', last_name: 'Minier' }, { id: 't', first_name: 'Teagan', last_name: null }]);
    const items = await withAddedByNames(client, [{ addedBy: 'e' }, { addedBy: 't' }, { addedBy: 'e' }, { addedBy: 'x' }]);
    expect(items.map((i) => i.addedByName)).toEqual(['Ethan Minier', 'Teagan', 'Ethan Minier', null]);
    expect(queried).toEqual([['e', 't', 'x']]);
  });

  it('skips the query for an empty list and survives a failed lookup', async () => {
    const empty = fakeProfiles([]);
    expect(await withAddedByNames(empty.client, [])).toEqual([]);
    expect(empty.queried).toHaveLength(0);
    const failing = fakeProfiles([], true);
    expect((await withAddedByNames(failing.client, [{ addedBy: 'e' }]))[0].addedByName).toBeNull();
  });

  it('joins first and last name', () => {
    expect(displayName({ firstName: 'Ethan', lastName: null })).toBe('Ethan');
    expect(displayName(undefined)).toBeNull();
  });
});
