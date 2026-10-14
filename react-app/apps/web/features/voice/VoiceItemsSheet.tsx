'use client';

import { useEffect, useRef, useState } from 'react';
import { GROCERY_STORE_INFO, autoPick, parseSpokenItems, type ItemMatch, type SpokenItem } from '@fuelify/shared';
import { useGroceryStore } from '@/lib/stores';
import { FoodTile, Icon, Spinner } from '@/components/ui';
import { VoiceSheet } from './VoiceSheet';

const amount = (i: SpokenItem) => (i.unit ? `${i.quantity} ${i.unit}` : i.quantity !== 1 ? `×${i.quantity}` : '');
const storeName = (m: ItemMatch) => (m.store ? GROCERY_STORE_INFO[m.store].name : null);

/** Why an option is offered, e.g. "Your usual · bought 3×" */
export function sourceNote(m: ItemMatch): string {
  const where = [storeName(m), m.price != null ? `$${m.price.toFixed(2)}` : null].filter(Boolean).join(' ');
  if (m.source === 'history') return [`Your usual${m.timesChosen > 1 ? ` · picked ${m.timesChosen}×` : ''}`, where].filter(Boolean).join(' · ');
  if (m.source === 'pantry') return ['In your pantry', m.brand].filter(Boolean).join(' · ');
  return [where, m.size].filter(Boolean).join(' · ');
}

/** An item as added: what was said, plus the product picked for it (if any). */
export interface MatchedItem extends SpokenItem {
  match: ItemMatch | null;
  /** Every option that was offered, best first */
  options: ItemMatch[];
  /** The match was filled in automatically (not chosen by hand) */
  auto: boolean;
}

/**
 * Say several items with amounts. They're split and previewed; once you stop
 * talking each one is matched to the product you most likely mean (your usual,
 * what's in the pantry, or the best fit at your stores), which you can change.
 */
export function VoiceItemsSheet({
  open,
  onClose,
  onAdd,
  householdId,
  title = 'Say your items',
  destination = 'list',
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (items: MatchedItem[]) => Promise<void>;
  householdId: string | null;
  title?: string;
  destination?: 'list' | 'pantry';
}) {
  const matchItems = useGroceryStore((s) => s.matchItems);
  // Items the person removed from the preview (by name)
  const [dropped, setDropped] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<string, ItemMatch[]>>({});
  // Hand-picked options by item name (null = "no specific product")
  const [chosen, setChosen] = useState<Record<string, ItemMatch | null>>({});
  const [looking, setLooking] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settled, setSettled] = useState<{ text: string; listening: boolean }>({ text: '', listening: true });
  const asked = useRef(new Set<string>());

  const items = (text: string) => parseSpokenItems(text).filter((i) => !dropped.includes(i.name));

  // Look up products once the words stop changing (not while still talking)
  useEffect(() => {
    if (!householdId || settled.listening) return;
    const names = items(settled.text).map((i) => i.name).filter((n) => !asked.current.has(n));
    if (names.length === 0) return;
    const timer = setTimeout(async () => {
      names.forEach((n) => asked.current.add(n));
      setLooking(true);
      const found = await matchItems(householdId, names);
      setMatches((m) => ({ ...m, ...found }));
      setLooking(false);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, householdId, matchItems]);

  const reset = () => {
    setDropped([]);
    setMatches({});
    setChosen({});
    setExpanded(null);
    asked.current = new Set();
  };

  const pickFor = (name: string): { match: ItemMatch | null; auto: boolean } => {
    if (name in chosen) return { match: chosen[name], auto: false };
    const options = matches[name] ?? [];
    return { match: autoPick(name, options), auto: true };
  };

  return (
    <VoiceSheet
      open={open}
      title={title}
      hint="Say each item with how much you need. Pause or say “and” between items."
      example="two pounds of ground beef, a dozen eggs and a gallon of milk"
      onClose={() => {
        reset();
        onClose();
      }}
      onChange={(text, listening) => setSettled({ text, listening })}
      preview={(text) => {
        const found = items(text);
        if (found.length === 0) return <p className="hint">No items yet.</p>;
        return (
          <div className="stack-sm">
            {looking && <p className="small muted row" style={{ gap: 8 }}><Spinner /> Finding products…</p>}
            <div className="list">
              {found.map((i) => {
                const options = matches[i.name] ?? [];
                const { match } = pickFor(i.name);
                const open = expanded === i.name;
                return (
                  <div key={`${i.name}-${i.unit}`}>
                    <div className="list-row" style={{ gap: 10, alignItems: 'center' }}>
                      <button type="button" className="grow" disabled={options.length === 0}
                        onClick={() => setExpanded(open ? null : i.name)}
                        aria-expanded={open} aria-label={`${i.name}: ${match ? match.label : 'no product chosen'}. Change product`}
                        style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', minWidth: 0, background: 'none', border: 0, padding: 0, color: 'inherit' }}>
                        {match && <FoodTile title={match.label} imageUrl={match.imageUrl} size={40} />}
                        <span className="grow" style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 600, textTransform: 'capitalize' }}>{i.name}</span>
                          {match ? (
                            <span className="tiny muted truncate" style={{ display: 'block' }}>{match.label} · {sourceNote(match)}</span>
                          ) : options.length > 0 ? (
                            <span className="tiny" style={{ display: 'block', color: 'var(--primary)' }}>{options.length} product{options.length === 1 ? '' : 's'} found · choose one</span>
                          ) : null}
                        </span>
                        {options.length > 0 && <Icon name={open ? 'chevronDown' : 'chevronRight'} size={18} />}
                      </button>
                      <span className="small muted" style={{ flexShrink: 0 }}>{amount(i)}</span>
                      <button type="button" className="icon-btn" aria-label={`Remove ${i.name}`} onClick={() => setDropped((d) => [...d, i.name])}>
                        <Icon name="x" size={18} />
                      </button>
                    </div>
                    {open && (
                      <div className="stack-sm" style={{ padding: '4px 12px 12px' }}>
                        {options.map((o) => {
                          const on = match?.productId === o.productId && match?.store === o.store && match?.label === o.label;
                          return (
                            <button key={`${o.source}:${o.store}:${o.productId}:${o.label}`} type="button" className="option" aria-pressed={on}
                              onClick={() => { setChosen((c) => ({ ...c, [i.name]: o })); setExpanded(null); }}
                              style={{ gap: 10, alignItems: 'center' }}>
                              <FoodTile title={o.label} imageUrl={o.imageUrl} size={36} />
                              <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                                <span className="small truncate" style={{ display: 'block', fontWeight: 600 }}>{o.label}</span>
                                <span className="tiny muted">{sourceNote(o)}</span>
                              </span>
                              {on && <Icon name="check" size={18} />}
                            </button>
                          );
                        })}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setChosen((c) => ({ ...c, [i.name]: null })); setExpanded(null); }}>
                          No specific product, just “{i.name}”
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
      canSubmit={(text) => items(text).length > 0}
      actionLabel={(text) => {
        const n = items(text).length;
        return n ? `Add ${n} item${n === 1 ? '' : 's'} to ${destination}` : 'Add items';
      }}
      onSubmit={async (text) => {
        await onAdd(items(text).map((i) => ({ ...i, ...pickFor(i.name), options: matches[i.name] ?? [] })));
        reset();
        return true;
      }}
    />
  );
}
