'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PANTRY_CATEGORIES,
  STORAGE_ZONES,
  STORAGE_ZONE_LABELS,
  aggregatePantryItems,
  lookupBarcode,
  type ItemStatus,
  type PantryItem,
  type PantryItemDraft,
  type PantryItemTotal,
  type StorageZone,
  daysUntil,
} from '@fuelify/shared';
import { useHouseholdStore, usePantryStore } from '@/lib/stores';
import { EmptyState, Icon, LoadingBlock, PageHeader, Segmented, Sheet } from '@/components/ui';
import { BarcodeScannerSheet } from '@/features/pantry/BarcodeScannerSheet';
import { ReceiptImportSheet } from '@/features/pantry/ReceiptImportSheet';
import { MealIdeasSheet } from '@/features/pantry/MealIdeasSheet';

const ZONE_ICON: Record<StorageZone, string> = { dry: '🥫', cool: '🧊', frozen: '❄️' };
const STATUS_BADGE: Record<ItemStatus, string> = { sealed: 'badge-accent', open: 'badge-primary', expired: 'badge-danger' };

export default function PantryPage() {
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const hhError = useHouseholdStore((s) => s.error);

  const items = usePantryStore((s) => s.items);
  const activeZone = usePantryStore((s) => s.activeZone);
  const fetchItems = usePantryStore((s) => s.fetchItems);
  const addItem = usePantryStore((s) => s.addItem);
  const addItems = usePantryStore((s) => s.addItems);
  const clearExpired = usePantryStore((s) => s.clearExpired);
  const setActiveZone = usePantryStore((s) => s.setActiveZone);
  const isLoading = usePantryStore((s) => s.isLoading);
  const pantryError = usePantryStore((s) => s.error);

  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<PantryItemDraft | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    ensureHousehold().finally(() => setStarted(true));
  }, [ensureHousehold]);

  useEffect(() => {
    if (activeHouseholdId) fetchItems(activeHouseholdId);
  }, [activeHouseholdId, fetchItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (activeZone === 'all' || i.storageZone === activeZone) && (!q || i.name.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q)));
  }, [items, activeZone, query]);

  const totals = useMemo(() => aggregatePantryItems(filtered), [filtered]);
  const group = useMemo(() => (groupName ? aggregatePantryItems(items).find((t) => t.name === groupName) ?? null : null), [items, groupName]);

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const openCount = items.filter((i) => i.status === 'open').length;
  const zoneCount = (z: StorageZone | 'all') => (z === 'all' ? items.length : items.filter((i) => i.storageZone === z).length);

  const openAdd = (preset?: PantryItemDraft) => {
    setDraft(preset ?? { name: '', storageZone: activeZone === 'all' ? 'dry' : activeZone, quantity: 1 });
    setAddOpen(true);
  };

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    setScannerOpen(false);
    setLookupBusy(true);
    setLookupError(null);
    try {
      const info = await lookupBarcode(barcode);
      if (!info) {
        setLookupError(`No product found for barcode ${barcode}. Add it manually.`);
        openAdd();
        return;
      }
      openAdd({ name: info.name, brand: info.brand, category: info.category, quantity: info.quantity ?? 1, unit: info.unit, storageZone: 'dry' });
    } catch (e) {
      setLookupError((e as Error).message);
    } finally {
      setLookupBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeZone]);

  const handleReceiptImport = useCallback(async (drafts: PantryItemDraft[]) => {
    if (activeHouseholdId) await addItems(activeHouseholdId, drafts);
  }, [activeHouseholdId, addItems]);

  if (!started || (!activeHouseholdId && !hhError)) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        title="Pantry"
        sub={`${items.length} item${items.length === 1 ? '' : 's'}${openCount ? ` · ${openCount} open` : ''}${expiredCount ? ` · ${expiredCount} expired` : ''}`}
        right={
          <div className="row" style={{ gap: 4 }}>
            <button className="icon-btn icon-btn-filled" aria-label="Scan barcode" onClick={() => setScannerOpen(true)} disabled={lookupBusy}>
              <Icon name="scan" size={20} />
            </button>
            <button className="icon-btn icon-btn-filled" aria-label="Import receipt" onClick={() => setReceiptOpen(true)}>
              <Icon name="receipt" size={20} />
            </button>
            <button className="icon-btn" aria-label="Add item" onClick={() => openAdd()} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>
              <Icon name="plus" size={22} />
            </button>
          </div>
        }
      />

      <div className="stack-sm" style={{ padding: '0 var(--gutter) 10px', flexShrink: 0 }}>
        <div className="chips-scroll">
          {(['all', ...STORAGE_ZONES] as const).map((z) => (
            <button key={z} className="chip" aria-pressed={activeZone === z} onClick={() => setActiveZone(z)}>
              {z === 'all' ? 'All' : `${ZONE_ICON[z]} ${STORAGE_ZONE_LABELS[z]}`}
              <span className="faint" style={{ fontWeight: 500 }}>{zoneCount(z)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="screen-scroll">
        <div className="screen-pad stack" style={{ paddingTop: 0, paddingBottom: 32 }}>
          {lookupBusy && <div className="alert alert-info">Looking up barcode…</div>}
          {lookupError && <div className="alert">{lookupError}</div>}
          {(pantryError || hhError) && <div className="alert">{pantryError ?? hhError}</div>}

          <button className="card card-button row" onClick={() => setSuggestionsOpen(true)} disabled={items.length === 0}
            style={{ gap: 12, background: 'linear-gradient(135deg, var(--accent-soft), var(--primary-soft) 55%, var(--tertiary-soft))' }}>
            <span style={{ color: 'var(--primary)' }}><Icon name="sparkles" /></span>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>Meal ideas from your pantry</div>
              <div className="small muted">AI suggestions that use up opened items first</div>
            </div>
            <Icon name="chevronRight" />
          </button>

          {items.length > 6 && (
            <div style={{ position: 'relative' }}>
              <span className="faint" style={{ position: 'absolute', left: 12, top: 12 }}><Icon name="search" size={20} /></span>
              <input className="input" style={{ paddingLeft: 40 }} placeholder="Search pantry" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search pantry" />
            </div>
          )}

          {isLoading && items.length === 0 ? (
            <LoadingBlock />
          ) : totals.length === 0 ? (
            <EmptyState
              icon="pantry"
              title={items.length === 0 ? 'Your pantry is empty' : 'Nothing here'}
              action={items.length === 0 ? (
                <div className="row wrap" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => openAdd()}><Icon name="plus" /> Add item</button>
                  <button className="btn btn-secondary" onClick={() => setScannerOpen(true)}><Icon name="scan" /> Scan</button>
                </div>
              ) : undefined}
            >
              {items.length === 0 ? 'Add groceries by hand, scan a barcode or import a receipt.' : 'No items match this filter.'}
            </EmptyState>
          ) : (
            <div className="stack-sm">
              {totals.map((t) => <TotalCard key={t.name} total={t} onClick={() => setGroupName(t.name)} />)}
            </div>
          )}

          {expiredCount > 0 && (
            <button className="btn btn-danger btn-block"
              onClick={() => activeHouseholdId && window.confirm('Remove all expired items?') && clearExpired(activeHouseholdId)}>
              <Icon name="trash" /> Clear {expiredCount} expired item{expiredCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>

      <AddItemSheet
        open={addOpen}
        draft={draft}
        onClose={() => setAddOpen(false)}
        onSave={async (d) => {
          if (activeHouseholdId) await addItem(activeHouseholdId, d);
          setAddOpen(false);
        }}
      />
      <GroupSheet
        total={group}
        onClose={() => setGroupName(null)}
        onAddAnother={(t) => { setGroupName(null); openAdd({ name: t.items[0].name, brand: t.items[0].brand ?? undefined, category: t.items[0].category ?? undefined, unit: t.unit ?? undefined, storageZone: t.items[0].storageZone, quantity: 1 }); }}
      />
      <BarcodeScannerSheet open={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={handleBarcodeScanned} />
      <ReceiptImportSheet open={receiptOpen} onClose={() => setReceiptOpen(false)} onImport={handleReceiptImport} />
      <MealIdeasSheet open={suggestionsOpen} onClose={() => setSuggestionsOpen(false)} pantryItems={items} />
    </>
  );
}

function expiryBadge(date: string | null) {
  if (!date) return null;
  const d = daysUntil(date);
  if (d < 0) return <span className="badge badge-danger">Expired {-d}d ago</span>;
  if (d <= 3) return <span className="badge badge-primary">{d === 0 ? 'Expires today' : `Expires in ${d}d`}</span>;
  return <span className="badge">Exp. {date}</span>;
}

function TotalCard({ total, onClick }: { total: PantryItemTotal; onClick: () => void }) {
  return (
    <button className="card card-button stack-sm" onClick={onClick} style={{ gap: 8 }}>
      <div className="row" style={{ gap: 12 }}>
        <span style={{ fontSize: 24, width: 32, textAlign: 'center' }} aria-hidden="true">{ZONE_ICON[total.storageZones[0] ?? 'dry']}</span>
        <div className="grow">
          <div className="truncate" style={{ fontWeight: 700 }}>{total.items[0]?.name ?? total.name}</div>
          <div className="small muted">
            {total.totalQuantity}{total.unit ? ` ${total.unit}` : ''}
            {total.itemCount > 1 ? ` · ${total.itemCount} packages` : ''}
            {total.items[0]?.brand ? ` · ${total.items[0].brand}` : ''}
          </div>
        </div>
        <Icon name="chevronRight" size={18} />
      </div>
      <div className="chips" style={{ gap: 6 }}>
        {total.sealedCount > 0 && <span className="badge badge-accent">{total.sealedCount} sealed</span>}
        {total.openCount > 0 && <span className="badge badge-primary">{total.openCount} open</span>}
        {total.expiredCount > 0 && <span className="badge badge-danger">{total.expiredCount} expired</span>}
        {expiryBadge(total.earliestExpiration)}
      </div>
      {total.openCount > 0 && (
        <div className="row" style={{ gap: 8 }}>
          <div className="progress grow"><div style={{ width: `${total.avgRemainingPct}%` }} /></div>
          <span className="tiny faint">{total.avgRemainingPct}% left</span>
        </div>
      )}
    </button>
  );
}

function GroupSheet({ total, onClose, onAddAnother }: { total: PantryItemTotal | null; onClose: () => void; onAddAnother: (t: PantryItemTotal) => void }) {
  const updateItem = usePantryStore((s) => s.updateItem);
  const deleteItem = usePantryStore((s) => s.deleteItem);
  const markOpen = usePantryStore((s) => s.markOpen);
  const markExpired = usePantryStore((s) => s.markExpired);

  return (
    <Sheet
      open={!!total}
      onClose={onClose}
      title={total?.items[0]?.name ?? ''}
      footer={total ? <button className="btn btn-secondary btn-block" onClick={() => onAddAnother(total)}><Icon name="plus" /> Add another</button> : undefined}
    >
      {total && (
        <div className="stack">
          {total.items.map((item: PantryItem) => (
            <div key={item.id} className="card stack-sm">
              <div className="row-between">
                <div>
                  <div style={{ fontWeight: 700 }}>{item.quantity}{item.unit ? ` ${item.unit}` : ''}{item.brand ? ` · ${item.brand}` : ''}</div>
                  <div className="tiny faint">{STORAGE_ZONE_LABELS[item.storageZone]}{item.category ? ` · ${item.category}` : ''}</div>
                </div>
                <span className={`badge ${STATUS_BADGE[item.status]}`} style={{ textTransform: 'capitalize' }}>{item.status}</span>
              </div>
              {expiryBadge(item.expirationDate)}
              {item.status === 'open' && (
                <div className="stack-sm">
                  <div className="row" style={{ gap: 8 }}>
                    <div className="progress grow"><div style={{ width: `${item.remainingPct}%` }} /></div>
                    <span className="tiny faint">{item.remainingPct}% left</span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    {[75, 50, 25].map((pct) => (
                      <button key={pct} className="chip grow" style={{ justifyContent: 'center' }} aria-pressed={item.remainingPct === pct}
                        onClick={() => updateItem(item.id, { remainingPct: pct })}>{pct}%</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="row" style={{ gap: 6 }}>
                {item.status === 'sealed' && <button className="btn btn-secondary btn-sm grow" onClick={() => markOpen(item.id)}>Mark opened</button>}
                {item.status !== 'expired' && <button className="btn btn-secondary btn-sm grow" onClick={() => markExpired(item.id)}>Mark expired</button>}
                <button className="btn btn-danger btn-sm" aria-label="Delete" onClick={() => deleteItem(item.id)}><Icon name="trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function AddItemSheet({ open, draft, onClose, onSave }: { open: boolean; draft: PantryItemDraft | null; onClose: () => void; onSave: (d: PantryItemDraft) => Promise<void> }) {
  const [d, setD] = useState<PantryItemDraft>({ name: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && draft) setD(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    if (!d.name.trim()) return;
    setBusy(true);
    await onSave({ ...d, name: d.name.trim(), brand: d.brand?.trim() || undefined, unit: d.unit?.trim() || undefined, quantity: d.quantity || 1 });
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add to pantry"
      footer={<button className="btn btn-primary btn-block" onClick={save} disabled={busy || !d.name.trim()}>{busy ? 'Adding…' : 'Add item'}</button>}>
      <div className="stack">
        <div className="field">
          <label htmlFor="pi-name">Item</label>
          <input id="pi-name" className="input" placeholder="e.g. Brown rice" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus={!draft?.name} />
        </div>
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
              <option value="">None</option>
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
