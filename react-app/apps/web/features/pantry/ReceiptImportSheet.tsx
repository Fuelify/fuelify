'use client';

import { useCallback, useState } from 'react';
import {
  STORAGE_ZONES,
  STORAGE_ZONE_LABELS,
  PANTRY_CATEGORIES,
  guessCategoryAndZone,
  linePrice,
  normalizeStore,
  type PantryItemDraft,
  type StorageZone,
} from '@fuelify/shared';
import { usePriceBookStore, useSupabase } from '@/lib/stores';
import { readReceipt, ReceiptReaderUnavailable, type ReceiptReading } from '@/lib/receipt-client';
import { usePriceBook } from '@/features/prices/usePriceBook';
import { Icon, Sheet, Spinner } from '@/components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Add the chosen items to the pantry. Without it the sheet only saves prices. */
  onImport?: (drafts: PantryItemDraft[]) => Promise<void>;
}

interface EditableLine extends PantryItemDraft {
  selected: boolean;
  /** What the receipt said */
  receiptText: string;
  /** Price for one, as paid */
  price: number | null;
  size: string | null;
}

const today = () => new Date().toLocaleDateString('en-CA');

function toLines(reading: ReceiptReading): EditableLine[] {
  return reading.items.map((i) => {
    const name = (i.name || i.receipt_text).trim();
    const { category, storageZone } = guessCategoryAndZone(name);
    const quantity = i.quantity > 0 ? i.quantity : 1;
    return {
      selected: true,
      receiptText: i.receipt_text,
      name,
      brand: i.brand ?? undefined,
      quantity: Number.isInteger(quantity) ? quantity : 1,
      category,
      storageZone: storageZone ?? 'dry',
      status: 'sealed',
      remainingPct: 100,
      price: linePrice({ unitPrice: i.unit_price, total: i.line_total, quantity }),
      size: i.size,
    };
  });
}

/**
 * Photo of a receipt → the items on it. Add them to the pantry and save what
 * you paid to the household's price book (so the Prices page and the cart
 * know Trader Joe's, Aldi, Wegmans… prices).
 */
export function ReceiptImportSheet({ open, onClose, onImport }: Props) {
  const supabase = useSupabase();
  const { region, ready } = usePriceBook();
  const record = usePriceBookStore((s) => s.record);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [result, setResult] = useState<ReceiptReading | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [store, setStore] = useState('');
  const [date, setDate] = useState(today());
  const [savePrices, setSavePrices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const reset = () => {
    setLoading(false);
    setError(null);
    setResult(null);
    setLines([]);
    setStore('');
    setDate(today());
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    setDone(null);
    onClose();
  };

  const handleFile = useCallback(
    async (file: File) => {
      reset();
      setDone(null);
      setLoading(true);
      try {
        const reading = await readReceipt(supabase, file);
        setResult(reading);
        setLines(toLines(reading));
        setStore(normalizeStore(reading.store_name)?.name ?? reading.store_name ?? '');
        if (reading.date && /^\d{4}-\d{2}-\d{2}$/.test(reading.date) && reading.date <= today()) setDate(reading.date);
      } catch (e) {
        if (e instanceof ReceiptReaderUnavailable) setUnavailable(true);
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  const updateLine = (i: number, patch: Partial<EditableLine>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const chosen = lines.filter((l) => l.selected && l.name.trim());
  const priced = chosen.filter((l) => l.price != null && l.price > 0);
  const storeKey = normalizeStore(store);

  const saveToPriceBook = async (): Promise<number> => {
    if (!storeKey || priced.length === 0) return 0;
    const receiptId = crypto.randomUUID();
    return record(
      priced.map((l) => ({
        storeKey: storeKey.key,
        storeName: storeKey.name,
        region,
        itemName: l.name.trim(),
        productName: l.receiptText,
        price: l.price!,
        quantity: l.quantity,
        size: l.size,
        observedOn: date,
        source: 'receipt' as const,
        receiptId,
      })),
    );
  };

  const finish = async (toPantry: boolean) => {
    if (chosen.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = savePrices || !toPantry ? await saveToPriceBook() : 0;
      if (toPantry && onImport) {
        await onImport(chosen.map(({ selected: _s, receiptText: _r, price: _p, size: _z, ...d }) => d));
      }
      const parts = [toPantry && onImport ? `${chosen.length} added to pantry` : null, saved ? `${saved} price${saved === 1 ? '' : 's'} saved` : null].filter(Boolean);
      reset();
      setDone(parts.join(' · ') || 'Done');
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  const canSavePrices = !!storeKey && priced.length > 0 && ready;

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Scan a receipt"
      footer={
        result && lines.length > 0 ? (
          onImport ? (
            <>
              <button className="btn btn-secondary" onClick={() => finish(false)} disabled={submitting || !canSavePrices}>Prices only</button>
              <button className="btn btn-primary grow" onClick={() => finish(true)} disabled={submitting || chosen.length === 0}>
                {submitting ? 'Saving…' : `Add ${chosen.length} to pantry`}
              </button>
            </>
          ) : (
            <button className="btn btn-primary grow" onClick={() => finish(false)} disabled={submitting || !canSavePrices}>
              {submitting ? 'Saving…' : `Save ${priced.length} price${priced.length === 1 ? '' : 's'}`}
            </button>
          )
        ) : undefined
      }
    >
      {loading ? (
        <div className="center-fill" style={{ minHeight: 200 }}>
          <Spinner />
          <p className="muted">Reading your receipt…</p>
          <p className="tiny faint">This takes a few seconds.</p>
        </div>
      ) : error && !result ? (
        <div className="stack">
          <div className="alert" role="alert">{error}</div>
          {unavailable ? (
            <p className="small muted">You can still log prices by hand on the Prices page.</p>
          ) : (
            <button className="btn btn-secondary" onClick={() => setError(null)}>Try again</button>
          )}
        </div>
      ) : !result ? (
        <div className="stack">
          {done && <div className="alert alert-info" role="status"><Icon name="checkCircle" size={16} /> {done}</div>}
          <p className="muted">
            Take a photo of your grocery receipt. We&apos;ll read each item and what you paid{onImport ? ', so you can add them to your pantry and keep track of prices' : ' for your price book'}.
          </p>
          <label className="card card-button center-fill" style={{ minHeight: 160, borderStyle: 'dashed', cursor: 'pointer' }}>
            <input
              style={{ display: 'none' }}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void handleFile(f);
              }}
            />
            <span style={{ color: 'var(--primary)' }}><Icon name="camera" size={32} /></span>
            <span style={{ fontWeight: 700 }}>{done ? 'Scan another receipt' : 'Take or choose a photo'}</span>
            <span className="tiny faint">Flat, well lit, whole receipt in frame</span>
          </label>
        </div>
      ) : (
        <div className="stack">
          <div className="row" style={{ gap: 8 }}>
            <div className="field grow" style={{ margin: 0 }}>
              <label htmlFor="receipt-store">Store</label>
              <input id="receipt-store" className="input" value={store} placeholder="e.g. Trader Joe’s" onChange={(e) => setStore(e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0, width: 150 }}>
              <label htmlFor="receipt-date">Date</label>
              <input id="receipt-date" className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} />
            </div>
          </div>
          <label className="row small" style={{ gap: 8 }}>
            <input type="checkbox" checked={savePrices} onChange={(e) => setSavePrices(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
            <span>Save prices to your price book{storeKey ? ` for ${storeKey.name}` : ''}</span>
          </label>
          {savePrices && !storeKey && <p className="hint">Add the store name to save prices.</p>}
          <div className="row-between">
            <span className="small muted">{chosen.length} of {lines.length} selected</span>
            {result.total != null && <span className="small muted">Receipt total ${result.total.toFixed(2)}</span>}
          </div>
          {error && <div className="alert" role="alert">{error}</div>}
          {lines.length === 0 ? (
            <p className="muted">No items found. Try a clearer photo.</p>
          ) : (
            lines.map((line, i) => (
              <div key={i} className="card stack-sm" style={{ opacity: line.selected ? 1 : 0.5 }}>
                <div className="row">
                  <input
                    type="checkbox"
                    aria-label={`Include ${line.name}`}
                    checked={line.selected}
                    onChange={(e) => updateLine(i, { selected: e.target.checked })}
                    style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                  />
                  <input className="input" style={{ height: 40 }} value={line.name} aria-label="Name"
                    onChange={(e) => updateLine(i, { name: e.target.value })} />
                  <input className="input" style={{ height: 40, width: 64, flexShrink: 0 }} type="number" min={0} step={1} aria-label="Quantity"
                    value={line.quantity ?? 1} onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 1 })} />
                  <span className="row" style={{ gap: 2, flexShrink: 0 }}>
                    <span className="muted">$</span>
                    <input className="input" style={{ height: 40, width: 76 }} type="number" min={0} step={0.01} inputMode="decimal" aria-label={`Price of ${line.name}`}
                      value={line.price ?? ''} onChange={(e) => updateLine(i, { price: e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0) })} />
                  </span>
                </div>
                <div className="tiny faint truncate">{[line.receiptText, line.size].filter(Boolean).join(' · ')}</div>
                {onImport && (
                  <div className="row">
                    <select className="select" style={{ height: 38, fontSize: 14 }} aria-label="Storage" value={line.storageZone ?? 'dry'}
                      onChange={(e) => updateLine(i, { storageZone: e.target.value as StorageZone })}>
                      {STORAGE_ZONES.map((z) => <option key={z} value={z}>{STORAGE_ZONE_LABELS[z]}</option>)}
                    </select>
                    <select className="select" style={{ height: 38, fontSize: 14 }} aria-label="Category" value={line.category ?? ''}
                      onChange={(e) => updateLine(i, { category: e.target.value || undefined })}>
                      <option value="">No category</option>
                      {PANTRY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setLines([]); }} disabled={submitting}>Start over</button>
        </div>
      )}
    </Sheet>
  );
}
