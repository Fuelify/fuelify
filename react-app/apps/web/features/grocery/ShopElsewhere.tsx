'use client';

import { useState } from 'react';
import {
  SHOP_ELSEWHERE_STORES,
  guessShopElsewhereStore,
  listAsText,
  storeSearchUrl,
  type ShareableItem,
  type ShopElsewhereStore,
} from '@fuelify/shared';
import { Icon, Sheet } from '@/components/ui';

const PICK_KEY = 'fuelify.shopElsewhere.store';

function rememberedStore(fallback: string | null | undefined): ShopElsewhereStore {
  try {
    const saved = localStorage.getItem(PICK_KEY);
    if (SHOP_ELSEWHERE_STORES.some((s) => s.id === saved)) return saved as ShopElsewhereStore;
  } catch {
    // storage blocked: use the household's store
  }
  return guessShopElsewhereStore(fallback);
}

/**
 * The simple fallback for stores we can't fill a cart at (Aldi, Publix,
 * Costco, Target…): share or copy the list, or open each item in the
 * store's own search and tick it off as you add it there.
 */
export function ShopElsewhere({
  items,
  preferredStore,
  label = 'Share or shop at another store',
  title = 'Groceries',
}: {
  items: ShareableItem[];
  /** e.g. the household's usual store, "Publix" */
  preferredStore?: string | null;
  label?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [store, setStore] = useState<ShopElsewhereStore>('aldi');
  const [done, setDone] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  if (items.length === 0) return null;
  const text = listAsText(items, title);

  const pick = (s: ShopElsewhereStore) => {
    setStore(s);
    try {
      localStorage.setItem(PICK_KEY, s);
    } catch {
      // not remembered; fine
    }
  };

  const share = async () => {
    setNote(null);
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    await copy();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setNote('List copied. Paste it into a message or your notes.');
    } catch {
      setNote('Couldn’t copy here. Select the list below and copy it.');
    }
  };

  const storeName = SHOP_ELSEWHERE_STORES.find((s) => s.id === store)!.name.replace(/ \(.*\)$/, '');

  return (
    <>
      <button type="button" className="btn btn-secondary btn-block" onClick={() => { setStore(rememberedStore(preferredStore)); setNote(null); setOpen(true); }}>
        <Icon name="upload" size={16} /> {label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Shop anywhere">
        <div className="stack">
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary grow" onClick={share}><Icon name="upload" size={16} /> Share list</button>
            <button type="button" className="btn btn-secondary grow" onClick={copy}>Copy list</button>
          </div>
          {note && <p className="small" role="status" style={{ color: 'var(--accent)' }}>{note}</p>}

          <div className="stack-sm">
            <div style={{ fontWeight: 700 }}>Find each item at</div>
            <div className="chips-scroll">
              {SHOP_ELSEWHERE_STORES.map((s) => (
                <button key={s.id} type="button" className="chip" aria-pressed={store === s.id} onClick={() => pick(s.id)}>
                  {s.name.replace(/ \(.*\)$/, '')}
                </button>
              ))}
            </div>
            <p className="hint">
              Opens {store === 'other' ? 'a web search' : `${storeName}’s search`} for each item in a new tab. Tick items off as you add them to your {store === 'other' ? '' : `${storeName} `}cart.
            </p>
          </div>

          <div className="list">
            {items.map((i) => {
              const got = done.includes(i.name);
              return (
                <div key={i.name} className="list-row" style={{ gap: 10 }}>
                  <button type="button" aria-label={got ? `Unmark ${i.name}` : `Mark ${i.name} added`} onClick={() => setDone((d) => (got ? d.filter((n) => n !== i.name) : [...d, i.name]))}
                    style={{
                      width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${got ? 'var(--accent)' : 'var(--text-3)'}`, background: got ? 'var(--accent)' : 'transparent', color: 'var(--on-primary)',
                    }}>
                    {got && <Icon name="check" size={14} />}
                  </button>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="truncate" style={{ display: 'block', fontWeight: 600, textTransform: 'capitalize', textDecoration: got ? 'line-through' : undefined, color: got ? 'var(--text-3)' : undefined }}>{i.name}</span>
                    {i.amount && <span className="tiny faint">{i.amount}</span>}
                  </span>
                  <a className="btn btn-ghost btn-sm" href={storeSearchUrl(store, i.name)} target="_blank" rel="noopener noreferrer"
                    onClick={() => setDone((d) => (d.includes(i.name) ? d : [...d, i.name]))} aria-label={`Find ${i.name} at ${storeName}`}>
                    Find <Icon name="search" size={14} />
                  </a>
                </div>
              );
            })}
          </div>

          <details>
            <summary className="small muted" style={{ cursor: 'pointer' }}>Show as text</summary>
            <textarea className="input" readOnly value={text} rows={Math.min(14, items.length + 3)} style={{ marginTop: 8, fontFamily: 'inherit', height: 'auto' }}
              onFocus={(e) => e.currentTarget.select()} />
          </details>
        </div>
      </Sheet>
    </>
  );
}
