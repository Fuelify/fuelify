'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PANTRY_CATEGORIES,
  STORAGE_ZONES,
  STORAGE_ZONE_LABELS,
  guessCategoryAndZone,
  pantryCategoryOf,
  type ItemMatch,
  type PantryItemDraft,
  type StorageZone,
} from '@fuelify/shared';
import { useGroceryStore, useSupabase } from '@/lib/stores';
import { sourceNote } from '@/features/voice/VoiceItemsSheet';
import { VoiceButton } from '@/features/voice/VoiceButton';
import { FoodTile, Icon, Segmented, Sheet, Spinner } from '@/components/ui';

/** A product to fill the form from: your usual, your pantry, a store, or one someone scanned. */
interface Suggestion {
  key: string;
  label: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  category: string | null;
  storageZone: StorageZone | null;
  note: string;
  /** Kept so the pick is learned (ranks first next time) */
  match?: ItemMatch;
  barcode?: string;
}

const MIN_CHARS = 2;

/** Saved products (barcodes people identified) whose name contains the words typed. */
async function savedProducts(supabase: ReturnType<typeof useSupabase>, q: string): Promise<Suggestion[]> {
  const words = q.replace(/[%_,()]/g, ' ').split(/\s+/).filter((w) => w.length > 1).slice(0, 4);
  if (words.length === 0) return [];
  let query = supabase.from('barcode_products').select('barcode, name, brand, category, image_url, quantity, unit');
  for (const w of words) query = query.ilike('name', `%${w}%`);
  const { data } = await query.limit(5);
  return (data ?? []).map((p) => ({
    key: `saved:${p.barcode}`,
    label: p.name,
    brand: p.brand,
    size: p.quantity && p.unit ? `${p.quantity} ${p.unit}` : null,
    imageUrl: p.image_url,
    category: p.category,
    storageZone: guessCategoryAndZone(p.name).storageZone ?? null,
    note: ['Scanned product', p.brand].filter(Boolean).join(' · '),
    barcode: p.barcode,
  }));
}

/**
 * Add to pantry: type anything and fill in the rest by hand, or pick one of
 * the products found as you type (your usual, what's in the pantry, store
 * products, scanned products) to fill name, brand, photo, aisle and shelf.
 */
export function AddItemSheet({
  open,
  draft,
  householdId,
  onClose,
  onSave,
}: {
  open: boolean;
  draft: PantryItemDraft | null;
  householdId: string | null;
  onClose: () => void;
  onSave: (d: PantryItemDraft) => Promise<void>;
}) {
  const supabase = useSupabase();
  const matchItems = useGroceryStore((s) => s.matchItems);
  const logItemPick = useGroceryStore((s) => s.logItemPick);
  const [d, setD] = useState<PantryItemDraft>({ name: '' });
  const [busy, setBusy] = useState(false);
  // Search runs only while they're typing the name (not after picking or for a scanned product)
  const [typing, setTyping] = useState(false);
  const [looking, setLooking] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open || !draft) return;
    setD(draft);
    setTyping(false);
    setSuggestions([]);
    setPicked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const q = d.name.trim();
  useEffect(() => {
    if (!open || !typing || q.length < MIN_CHARS) {
      setSuggestions([]);
      setLooking(false);
      return;
    }
    const mine = ++seq.current;
    setLooking(true);
    const timer = setTimeout(async () => {
      const [matched, saved] = await Promise.all([
        householdId ? matchItems(householdId, [q]).then((r) => r[q] ?? []).catch(() => []) : Promise.resolve([] as ItemMatch[]),
        savedProducts(supabase, q).catch(() => []),
      ]);
      if (mine !== seq.current) return;
      const fromMatches: Suggestion[] = matched.map((m) => ({
        key: `${m.source}:${m.store}:${m.productId}:${m.label}`,
        label: m.label,
        brand: m.brand,
        size: m.size,
        imageUrl: m.imageUrl,
        category: m.category,
        storageZone: m.storageZone,
        note: sourceNote(m),
        match: m,
      }));
      const seen = new Set(fromMatches.map((s) => s.label.toLowerCase()));
      setSuggestions([...fromMatches, ...saved.filter((s) => !seen.has(s.label.toLowerCase()))].slice(0, 8));
      setLooking(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [q, typing, open, householdId, matchItems, supabase]);

  const pick = (s: Suggestion) => {
    const zone = s.storageZone ?? d.storageZone ?? 'dry';
    setD({
      ...d,
      name: s.label,
      brand: s.brand ?? undefined,
      imageUrl: s.imageUrl ?? undefined,
      barcode: s.barcode ?? d.barcode,
      storageZone: zone,
      category: pantryCategoryOf({ name: s.label, category: s.category, storageZone: zone }),
    });
    setPicked(s);
    setTyping(false);
    setSuggestions([]);
  };

  const save = async () => {
    if (!d.name.trim()) return;
    setBusy(true);
    await onSave({ ...d, name: d.name.trim(), brand: d.brand?.trim() || undefined, unit: d.unit?.trim() || undefined, quantity: d.quantity || 1 });
    if (picked?.match && householdId) {
      logItemPick({ householdId, destination: 'pantry', name: picked.label, match: picked.match, options: suggestions.flatMap((s) => (s.match ? [s.match] : [])), auto: false });
    }
    setBusy(false);
  };

  const showList = typing && q.length >= MIN_CHARS && (looking || suggestions.length > 0);

  return (
    <Sheet open={open} onClose={onClose} title="Add to pantry"
      footer={<button className="btn btn-primary btn-block" onClick={save} disabled={busy || !d.name.trim()}>{busy ? 'Adding…' : 'Add item'}</button>}>
      <div className="stack">
        {d.imageUrl && (
          <div className="row" style={{ justifyContent: 'center', position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.imageUrl} alt="" style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 12, background: '#fff' }} />
            <button type="button" className="icon-btn" aria-label="Remove photo" onClick={() => setD({ ...d, imageUrl: undefined })} style={{ position: 'absolute', right: 0, top: 0 }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        <div className="field">
          <label htmlFor="pi-name">Item</label>
          <div className="row" style={{ gap: 8 }}>
            <input id="pi-name" className="input" placeholder="Type to search, or enter anything" value={d.name} autoComplete="off"
              aria-autocomplete="list" aria-controls="pi-suggestions" aria-expanded={showList}
              onChange={(e) => { setD({ ...d, name: e.target.value }); setTyping(true); setPicked(null); }}
              autoFocus={!draft?.name} />
            <VoiceButton label="Say the item" onText={(t) => { setD({ ...d, name: t }); setTyping(true); setPicked(null); }} />
          </div>
          {picked ? (
            <span className="hint">Filled in from {picked.note.toLowerCase().startsWith('your') || picked.note.toLowerCase().startsWith('in your') ? picked.note.charAt(0).toLowerCase() + picked.note.slice(1) : picked.note}. Edit anything below.</span>
          ) : (
            !showList && <span className="hint">Pick a match to fill in the details, or just fill them in yourself.</span>
          )}
        </div>

        {showList && (
          <div id="pi-suggestions" role="listbox" aria-label="Matching products" className="list" style={{ marginTop: -6 }}>
            {looking && suggestions.length === 0 ? (
              <div className="list-row small muted" style={{ gap: 8 }}><Spinner /> Searching…</div>
            ) : (
              suggestions.map((s) => (
                <button key={s.key} type="button" role="option" aria-selected={false} className="list-row" onClick={() => pick(s)} style={{ width: '100%', textAlign: 'left', gap: 10 }}>
                  <FoodTile title={s.label} imageUrl={s.imageUrl} size={40} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="truncate" style={{ display: 'block', fontWeight: 600 }}>{s.label}</span>
                    <span className="tiny faint truncate" style={{ display: 'block' }}>{[s.note, s.size && !s.note.includes(s.size) ? s.size : null].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              ))
            )}
            {!looking && (
              <button type="button" className="list-row small" onClick={() => { setTyping(false); setSuggestions([]); }} style={{ width: '100%', textAlign: 'left', color: 'var(--text-2)' }}>
                Keep “{q}” and fill in the rest myself
              </button>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="pi-brand">Brand</label>
          <input id="pi-brand" className="input" placeholder="Optional" value={d.brand ?? ''} onChange={(e) => setD({ ...d, brand: e.target.value })} />
        </div>
        <div className="field">
          <span className="label">Stored in</span>
          <Segmented<StorageZone>
            options={STORAGE_ZONES.map((z) => ({ value: z, label: STORAGE_ZONE_LABELS[z].replace(' / Pantry', '') }))}
            value={d.storageZone ?? 'dry'}
            onChange={(z) => setD({ ...d, storageZone: z })}
          />
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ width: 96 }}>
            <label htmlFor="pi-qty">Quantity</label>
            <input id="pi-qty" className="input" type="number" inputMode="decimal" min={0} step={0.5} value={d.quantity ?? 1}
              onChange={(e) => setD({ ...d, quantity: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="field grow">
            <label htmlFor="pi-unit">Unit</label>
            <input id="pi-unit" className="input" placeholder="e.g. lbs, bags, cans" value={d.unit ?? ''} onChange={(e) => setD({ ...d, unit: e.target.value })} />
          </div>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field grow">
            <label htmlFor="pi-cat">Category</label>
            <select id="pi-cat" className="select" value={d.category ?? ''} onChange={(e) => setD({ ...d, category: e.target.value || undefined })}>
              <option value="">Guess from name</option>
              {PANTRY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field grow">
            <label htmlFor="pi-exp">Expires</label>
            <input id="pi-exp" className="input" type="date" value={d.expirationDate ?? ''} onChange={(e) => setD({ ...d, expirationDate: e.target.value || undefined })} />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
