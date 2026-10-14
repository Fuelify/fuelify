'use client';

import { useEffect, useState } from 'react';
import { COMMON_STORE_KEYS, normalizeStore, storeNameForKey } from '@fuelify/shared';
import { usePriceBookStore } from '@/lib/stores';
import { VoiceButton } from '@/features/voice/VoiceButton';
import { Sheet, Spinner } from '@/components/ui';
import { usePriceBook } from './usePriceBook';

const today = () => new Date().toLocaleDateString('en-CA');
const STORE_PICK_KEY = 'fuelify.prices.store';

/** Log one price by hand (seen on a shelf tag, a flyer, or a receipt you don't want to scan). */
export function LogPriceSheet({ open, onClose, initialItem = '' }: { open: boolean; onClose: () => void; initialItem?: string }) {
  const { region } = usePriceBook();
  const record = usePriceBookStore((s) => s.record);
  const saving = usePriceBookStore((s) => s.saving);
  const [item, setItem] = useState(initialItem);
  const [storeKey, setStoreKey] = useState<string>('trader-joes');
  const [otherStore, setOtherStore] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [date, setDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setItem(initialItem);
    setError(null);
    setSaved(null);
    try {
      const last = localStorage.getItem(STORE_PICK_KEY);
      if (last) setStoreKey(last);
    } catch {
      // keep the default store
    }
  }, [open, initialItem]);

  const store = storeKey === 'other' ? normalizeStore(otherStore) : { key: storeKey, name: storeNameForKey(storeKey) ?? storeKey };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(price);
    if (!item.trim()) return setError('What did you price?');
    if (!store) return setError('Which store?');
    if (!(amount > 0 && amount < 1000)) return setError('Enter the price, e.g. 3.49');
    const n = await record([{ storeKey: store.key, storeName: store.name, region, itemName: item.trim(), price: amount, size: size.trim() || null, observedOn: date, source: 'manual' }]);
    if (!n) return setError('Couldn’t save. Try again.');
    try {
      localStorage.setItem(STORE_PICK_KEY, storeKey);
    } catch {
      // not remembered
    }
    setSaved(`${item.trim()} · $${amount.toFixed(2)} at ${store.name}`);
    setItem('');
    setPrice('');
    setSize('');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Log a price">
      <form className="stack" onSubmit={save}>
        {saved && <div className="alert alert-info" role="status">Saved: {saved}. Add another?</div>}
        <div className="field">
          <label htmlFor="price-item">Item</label>
          <div className="row" style={{ gap: 8 }}>
            <input id="price-item" className="input" placeholder="e.g. oat milk" value={item} onChange={(e) => setItem(e.target.value)} autoComplete="off" />
            <VoiceButton label="Say the item" onText={setItem} />
          </div>
        </div>
        <div className="field">
          <span className="label">Store</span>
          <div className="chips">
            {[...COMMON_STORE_KEYS, 'other'].map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={storeKey === k} onClick={() => setStoreKey(k)}>
                {k === 'other' ? 'Other' : storeNameForKey(k)}
              </button>
            ))}
          </div>
          {storeKey === 'other' && (
            <input className="input" style={{ marginTop: 8 }} placeholder="Store name" aria-label="Store name" value={otherStore} onChange={(e) => setOtherStore(e.target.value)} />
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="field grow" style={{ margin: 0 }}>
            <label htmlFor="price-amount">Price</label>
            <input id="price-amount" className="input" inputMode="decimal" type="number" min={0} step={0.01} placeholder="3.49" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="field grow" style={{ margin: 0 }}>
            <label htmlFor="price-size">Size (optional)</label>
            <input id="price-size" className="input" placeholder="e.g. 64 oz" value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="price-date">Date</label>
          <input id="price-date" className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} />
        </div>
        {error && <div className="alert" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={saving}>{saving ? <Spinner /> : 'Save price'}</button>
      </form>
    </Sheet>
  );
}
