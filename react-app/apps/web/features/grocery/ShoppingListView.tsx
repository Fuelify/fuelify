'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { addDays, formatAmounts, fromISODate, todayISO, type ListItem } from '@fuelify/shared';
import { useGroceryStore } from '@/lib/stores';
import { Icon, Sheet, Spinner } from '@/components/ui';
import { SwapOptions } from './SwapOptions';

const DAYS = 7;
const short = (iso: string) => fromISODate(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * The week's shopping list: every ingredient the planned meals need, by aisle.
 * Pantry items are shown but marked; tap an item to swap it or skip it.
 */
export function ShoppingListView({ householdId, premium }: { householdId: string; premium: boolean }) {
  const list = useGroceryStore((s) => s.list);
  const busy = useGroceryStore((s) => s.busy);
  const error = useGroceryStore((s) => s.error);
  const loadList = useGroceryStore((s) => s.loadList);
  const [open, setOpen] = useState<ListItem | null>(null);

  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(todayISO(), i)), []);
  useEffect(() => {
    if (premium) loadList(householdId, dates);
  }, [premium, householdId, dates, loadList]);

  if (!premium) {
    return (
      <div className="card stack-sm">
        <div style={{ fontWeight: 700 }}>Your week’s list, made for you</div>
        <p className="small muted">Premium builds this list from your meal plan: every ingredient, combined across meals, with what’s already in your pantry marked.</p>
        <Link href="/premium" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>See Premium</Link>
      </div>
    );
  }
  if (!list && busy === 'list') return <div className="center" style={{ padding: 24 }}><Spinner /></div>;
  if (!list) return error ? <div className="alert">{error}</div> : null;

  const byCategory = new Map<string, ListItem[]>();
  for (const item of list.items) byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
  const toBuy = list.items.filter((i) => !i.inPantry && !list.skipped.includes(i.key)).length;

  return (
    <section className="stack">
      <div className="row-between">
        <div>
          <h2 className="h3">From your meal plan</h2>
          <p className="tiny muted">{short(dates[0])} – {short(dates[dates.length - 1])} · {list.items.length} items · {toBuy} to buy</p>
        </div>
        {busy === 'list' && <Spinner />}
      </div>

      {list.items.length === 0 ? (
        <p className="hint">
          Nothing planned yet. <Link href="/plan" style={{ color: 'var(--primary)', fontWeight: 600 }}>Plan some meals</Link> and their ingredients show up here.
        </p>
      ) : (
        [...byCategory.entries()].map(([category, items]) => (
          <div key={category} className="stack-sm">
            <div className="section-title" style={{ margin: 0 }}><span>{category}</span></div>
            <ul className="list" style={{ listStyle: 'none' }}>
              {items.map((item) => {
                const skipped = list.skipped.includes(item.key);
                const swapped = item.sources.some((s) => s.line !== s.original);
                const muted = item.inPantry || skipped;
                return (
                  <li key={item.key}>
                    <button className="list-row" onClick={() => setOpen(item)} style={{ width: '100%', textAlign: 'left', gap: 10, minHeight: 50 }}>
                      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 3, background: muted ? 'var(--text-3)' : 'var(--primary)', flexShrink: 0 }} />
                      <span className="grow" style={{ minWidth: 0, opacity: muted ? 0.6 : 1 }}>
                        <span style={{ display: 'block', fontWeight: 600, textTransform: 'capitalize', textDecoration: skipped ? 'line-through' : undefined }}>{item.name}</span>
                        <span className="tiny faint truncate" style={{ display: 'block' }}>{item.recipes.join(', ')}</span>
                      </span>
                      {item.inPantry && <span className="badge">In pantry</span>}
                      {skipped && !item.inPantry && <span className="badge">Skipped</span>}
                      {swapped && <span className="badge badge-tertiary">Swapped</span>}
                      <span className="small muted" style={{ flexShrink: 0 }}>{formatAmounts(item.amounts)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
      {list.mealsWithoutRecipe > 0 && <p className="hint">{list.mealsWithoutRecipe === 1 ? '1 meal you typed in yourself has' : `${list.mealsWithoutRecipe} meals you typed in yourself have`} no ingredient list.</p>}

      <ListItemSheet item={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function ListItemSheet({ item, onClose }: { item: ListItem | null; onClose: () => void }) {
  const list = useGroceryStore((s) => s.list);
  const busy = useGroceryStore((s) => s.busy);
  const toggleSkip = useGroceryStore((s) => s.toggleSkip);
  const swapListItem = useGroceryStore((s) => s.swapListItem);
  const unswapListItem = useGroceryStore((s) => s.unswapListItem);
  if (!item) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const skipped = list?.skipped.includes(item.key) ?? false;
  const swapped = item.sources.some((s) => s.line !== s.original);

  return (
    <Sheet open onClose={onClose} title={item.name.replace(/^\w/, (c) => c.toUpperCase())}>
      <div className="stack">
        <div className="card stack-sm">
          <div className="row-between"><span className="muted">Needed</span><strong>{formatAmounts(item.amounts) || '—'}</strong></div>
          <div className="small muted">For {item.recipes.join(', ')}</div>
          {item.inPantry && <div className="small" style={{ color: 'var(--accent)' }}><Icon name="check" size={14} /> In your pantry, so it’s left out of the cart.</div>}
          {swapped && <div className="small muted">Swapped from {item.sources.find((s) => s.line !== s.original)?.original}</div>}
        </div>

        {!item.inPantry && (
          <button className="btn btn-secondary btn-block" onClick={async () => { await toggleSkip(item.key); onClose(); }}>
            {skipped ? 'Add back to this week’s cart' : 'I don’t need this (skip this week)'}
          </button>
        )}
        {swapped && (
          <button className="btn btn-secondary btn-block" disabled={busy === 'swapping'} onClick={async () => { await unswapListItem(item); onClose(); }}>
            Undo swap
          </button>
        )}
        <SwapOptions
          ingredient={item.name}
          busy={busy === 'swapping'}
          label={`Swap in ${item.recipes.length === 1 ? item.recipes[0] : `all ${item.recipes.length} meals`}`}
          onSwap={async (name, meta) => {
            await swapListItem(item, name, meta);
            onClose();
          }}
        />
      </div>
    </Sheet>
  );
}
