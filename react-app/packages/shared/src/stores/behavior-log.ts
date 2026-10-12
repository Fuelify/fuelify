// Behavior log: stores call `track(event)` whenever a person makes a choice
// worth learning from. Events are batched and written in the background; a
// failed write is retried a few times and never blocks or breaks the app.

import type { BehaviorContext, BehaviorEvent } from '../models/behavior-event';
import type { BehaviorRow } from '../supabase/behavior-repo';

export interface BehaviorLog {
  track: (event: BehaviorEvent) => void;
  /** Write anything queued now (e.g. when the page is hidden). */
  flush: () => Promise<void>;
}

/** For tests and stores created without logging. */
export const NO_BEHAVIOR_LOG: BehaviorLog = { track: () => {}, flush: async () => {} };

const FLUSH_DELAY_MS = 1500;
const MAX_BATCH = 50;
const MAX_ATTEMPTS = 3;

export function createBehaviorLog(
  sink: { insert: (rows: BehaviorRow[]) => Promise<void> },
  userId: string,
  getContext: () => BehaviorContext = () => ({}),
  options: { sessionId?: string; delayMs?: number } = {},
): BehaviorLog {
  const sessionId = options.sessionId ?? globalThis.crypto?.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const delay = options.delayMs ?? FLUSH_DELAY_MS;
  let queue: { row: BehaviorRow; attempts: number }[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let flushing: Promise<void> | null = null;

  const schedule = () => {
    if (!timer) timer = setTimeout(() => void flush(), delay);
  };

  const flush = async (): Promise<void> => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (flushing) await flushing;
    if (queue.length === 0) return;
    const batch = queue.slice(0, MAX_BATCH);
    queue = queue.slice(MAX_BATCH);
    flushing = sink
      .insert(batch.map((b) => b.row))
      .catch(() => {
        const retry = batch.filter((b) => b.attempts + 1 < MAX_ATTEMPTS).map((b) => ({ ...b, attempts: b.attempts + 1 }));
        queue = [...retry, ...queue];
      })
      .finally(() => {
        flushing = null;
      });
    await flushing;
    if (queue.length > 0) schedule();
  };

  return {
    track: (event) => {
      let context: BehaviorContext = {};
      try {
        context = getContext();
      } catch {
        // Context is best-effort
      }
      queue.push({ row: { event, userId, sessionId, clientTs: new Date().toISOString(), context }, attempts: 0 });
      schedule();
    },
    flush,
  };
}
