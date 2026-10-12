import { describe, expect, it, vi } from 'vitest';
import { createBehaviorLog } from './behavior-log';
import type { BehaviorRow } from '../supabase/behavior-repo';

describe('behavior log', () => {
  it('batches events with the session, timestamp and context', async () => {
    const insert = vi.fn(async (_rows: BehaviorRow[]) => {});
    const log = createBehaviorLog({ insert }, 'u1', () => ({ diet: 'Vegan' }), { sessionId: 's1', delayMs: 10_000 });
    log.track({ type: 'list_item_skipped', fromKey: 'onion' });
    log.track({ type: 'cart_cleared' });
    expect(insert).not.toHaveBeenCalled();
    await log.flush();
    expect(insert).toHaveBeenCalledTimes(1);
    const rows = insert.mock.calls[0][0];
    expect(rows.map((r) => r.event.type)).toEqual(['list_item_skipped', 'cart_cleared']);
    expect(rows[0]).toMatchObject({ userId: 'u1', sessionId: 's1', context: { diet: 'Vegan' } });
    expect(Date.parse(rows[0].clientTs)).not.toBeNaN();
  });

  it('retries a failed write a few times, then drops it without throwing', async () => {
    const insert = vi.fn(async () => {
      throw new Error('offline');
    });
    const log = createBehaviorLog({ insert }, 'u1', undefined, { delayMs: 10_000 });
    log.track({ type: 'cart_cleared' });
    await log.flush();
    await log.flush();
    await log.flush();
    await log.flush();
    expect(insert).toHaveBeenCalledTimes(3);
  });

  it('never lets a broken context getter lose the event', async () => {
    const insert = vi.fn(async (_rows: BehaviorRow[]) => {});
    const log = createBehaviorLog({ insert }, 'u1', () => {
      throw new Error('no profile');
    }, { delayMs: 10_000 });
    log.track({ type: 'cart_cleared' });
    await log.flush();
    expect(insert.mock.calls[0][0][0].context).toEqual({});
  });
});
