'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useHouseholdStore, usePantryStore } from '../../providers';
import {
  STORAGE_ZONES,
  STORAGE_ZONE_LABELS,
  aggregatePantryItems,
  lookupBarcode,
  type StorageZone,
  type ItemStatus,
  type PantryItemDraft,
} from '@fuelify/shared';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ReceiptImportModal } from './ReceiptImportModal';

const ZONE_TABS: Array<StorageZone | 'all'> = ['all', ...STORAGE_ZONES];
const ZONE_TAB_LABELS: Record<string, string> = {
  all: 'All',
  ...STORAGE_ZONE_LABELS,
};

const STATUS_COLORS: Record<ItemStatus, string> = {
  sealed: '#4DB6AC',
  open: '#FFBD73',
  expired: '#ff6b6b',
};

export default function PantryPage() {
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const households = useHouseholdStore((s) => s.households);
  const fetchHouseholds = useHouseholdStore((s) => s.fetchHouseholds);
  const hhLoading = useHouseholdStore((s) => s.isLoading);

  const items = usePantryStore((s) => s.items);
  const activeZone = usePantryStore((s) => s.activeZone);
  const fetchItems = usePantryStore((s) => s.fetchItems);
  const addItem = usePantryStore((s) => s.addItem);
  const addItems = usePantryStore((s) => s.addItems);
  const updateItem = usePantryStore((s) => s.updateItem);
  const deleteItem = usePantryStore((s) => s.deleteItem);
  const markOpen = usePantryStore((s) => s.markOpen);
  const markExpired = usePantryStore((s) => s.markExpired);
  const clearExpired = usePantryStore((s) => s.clearExpired);
  const setActiveZone = usePantryStore((s) => s.setActiveZone);
  const isLoading = usePantryStore((s) => s.isLoading);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState<string | undefined>(undefined);
  const [newZone, setNewZone] = useState<StorageZone>('dry');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('');

  // Scanner / receipt
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Expanded item groups
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => { fetchHouseholds(); }, []);
  useEffect(() => { if (activeHouseholdId) fetchItems(activeHouseholdId); }, [activeHouseholdId]);

  const filteredItems = useMemo(() => {
    if (activeZone === 'all') return items;
    return items.filter((i) => i.storageZone === activeZone);
  }, [items, activeZone]);

  const totals = useMemo(() => aggregatePantryItems(filteredItems), [filteredItems]);

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const openCount = items.filter((i) => i.status === 'open').length;

  const resetAddForm = useCallback(() => {
    setNewName('');
    setNewBrand('');
    setNewCategory(undefined);
    setNewZone('dry');
    setNewQuantity('1');
    setNewUnit('');
  }, []);

  const handleAdd = useCallback(async () => {
    if (!newName.trim() || !activeHouseholdId) return;
    await addItem(activeHouseholdId, {
      name: newName.trim(),
      brand: newBrand.trim() || undefined,
      category: newCategory,
      storageZone: newZone,
      quantity: parseFloat(newQuantity) || 1,
      unit: newUnit.trim() || undefined,
    });
    resetAddForm();
    setShowAdd(false);
  }, [newName, newBrand, newCategory, newZone, newQuantity, newUnit, activeHouseholdId, addItem, resetAddForm]);

  const handleBarcodeScanned = useCallback(
    async (barcode: string) => {
      setScannerOpen(false);
      setLookupBusy(true);
      setLookupError(null);
      try {
        const info = await lookupBarcode(barcode);
        if (!info) {
          setLookupError(`No product found for barcode ${barcode}. Add it manually.`);
          resetAddForm();
          setShowAdd(true);
          return;
        }
        resetAddForm();
        setNewName(info.name);
        if (info.brand) setNewBrand(info.brand);
        if (info.category) setNewCategory(info.category);
        if (info.quantity) setNewQuantity(String(info.quantity));
        if (info.unit) setNewUnit(info.unit);
        setShowAdd(true);
      } catch (e) {
        setLookupError((e as Error).message);
      } finally {
        setLookupBusy(false);
      }
    },
    [resetAddForm],
  );

  const handleReceiptImport = useCallback(
    async (drafts: PantryItemDraft[]) => {
      if (!activeHouseholdId) return;
      await addItems(activeHouseholdId, drafts);
    },
    [activeHouseholdId, addItems],
  );

  const handleClearExpired = useCallback(() => {
    if (!activeHouseholdId) return;
    if (window.confirm('Remove all expired items?')) {
      clearExpired(activeHouseholdId);
    }
  }, [activeHouseholdId, clearExpired]);

  if (!hhLoading && households.length === 0) {
    return (
      <div style={s.container}>
        <h1 style={s.title}>Pantry</h1>
        <p style={s.emptyText}>Create a household first (go to Cart tab) to start tracking your pantry.</p>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <h1 style={s.title}>Pantry</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={s.secondaryButton}
              onClick={() => setScannerOpen(true)}
              disabled={lookupBusy}
              title="Scan a product barcode"
            >
              📷 Scan
            </button>
            <button
              style={s.secondaryButton}
              onClick={() => setReceiptOpen(true)}
              title="Upload a grocery receipt"
            >
              🧾 Receipt
            </button>
            <button style={s.addButton} onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? 'Cancel' : '+ Add Item'}
            </button>
          </div>
        </div>
        {lookupBusy && <p style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>Looking up barcode…</p>}
        {lookupError && (
          <p style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>{lookupError}</p>
        )}

        {/* Summary */}
        <div style={s.summary}>
          <span style={s.summaryItem}>{items.length} items</span>
          {openCount > 0 && <span style={{ ...s.summaryItem, color: '#FFBD73' }}>{openCount} open</span>}
          {expiredCount > 0 && <span style={{ ...s.summaryItem, color: '#ff6b6b' }}>{expiredCount} expired</span>}
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={s.addForm}>
          <input
            style={s.input}
            placeholder="Item name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <input
            style={s.input}
            placeholder="Brand (optional)"
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
          />
          {newCategory && (
            <div style={{ color: '#4DB6AC', fontSize: 12, marginBottom: 8 }}>
              Category: {newCategory}
            </div>
          )}
          <div style={s.formRow}>
            <div style={s.zonePicker}>
              {STORAGE_ZONES.map((z) => (
                <button
                  key={z}
                  style={{ ...s.zoneBtn, ...(newZone === z ? s.zoneBtnActive : {}) }}
                  onClick={() => setNewZone(z)}
                >
                  {STORAGE_ZONE_LABELS[z]}
                </button>
              ))}
            </div>
          </div>
          <div style={s.formRow}>
            <input
              style={{ ...s.input, flex: 1, marginRight: 8 }}
              placeholder="Qty"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              type="number"
              min="0"
              step="0.5"
            />
            <input
              style={{ ...s.input, flex: 2 }}
              placeholder="Unit (e.g. lbs, bags)"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
            />
            <button
              style={{ ...s.primaryBtn, marginLeft: 8, ...(!newName.trim() ? { opacity: 0.4 } : {}) }}
              onClick={handleAdd}
              disabled={!newName.trim()}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Zone tabs */}
      <div style={s.zoneTabs}>
        {ZONE_TABS.map((zone) => (
          <button
            key={zone}
            style={{ ...s.zoneTab, ...(activeZone === zone ? s.zoneTabActive : {}) }}
            onClick={() => setActiveZone(zone)}
          >
            {ZONE_TAB_LABELS[zone]}
          </button>
        ))}
      </div>

      {/* Item totals list */}
      {isLoading ? (
        <p style={s.emptyText}>Loading...</p>
      ) : totals.length === 0 ? (
        <p style={s.emptyText}>No items in this section.</p>
      ) : (
        <div style={s.list}>
          {totals.map((total) => {
            const isExpanded = expandedGroup === total.name;
            return (
              <div key={total.name} style={s.card}>
                <div
                  style={s.cardHeader}
                  onClick={() => setExpandedGroup(isExpanded ? null : total.name)}
                >
                  <div>
                    <span style={s.cardName}>{total.name}</span>
                    <span style={s.cardQty}>
                      {' '}{total.totalQuantity}{total.unit ? ` ${total.unit}` : ''}
                      {total.itemCount > 1 ? ` (${total.itemCount})` : ''}
                    </span>
                  </div>
                  <span style={s.expandIcon}>{isExpanded ? '▾' : '▸'}</span>
                </div>

                {/* Badges */}
                <div style={s.badges}>
                  {total.sealedCount > 0 && (
                    <span style={{ ...s.badge, backgroundColor: STATUS_COLORS.sealed }}>
                      {total.sealedCount} sealed
                    </span>
                  )}
                  {total.openCount > 0 && (
                    <span style={{ ...s.badge, backgroundColor: STATUS_COLORS.open }}>
                      {total.openCount} open
                    </span>
                  )}
                  {total.expiredCount > 0 && (
                    <span style={{ ...s.badge, backgroundColor: STATUS_COLORS.expired }}>
                      {total.expiredCount} expired
                    </span>
                  )}
                </div>

                {/* Progress bar for open items */}
                {total.openCount > 0 && (
                  <div style={s.progressBar}>
                    <div style={{ ...s.progressFill, width: `${total.avgRemainingPct}%` }} />
                    <span style={s.progressText}>{total.avgRemainingPct}% remaining</span>
                  </div>
                )}

                {total.earliestExpiration && (
                  <p style={s.expirationText}>Expires: {total.earliestExpiration}</p>
                )}

                {/* Expanded: individual items */}
                {isExpanded && (
                  <div style={s.itemList}>
                    {total.items.map((item) => (
                      <div key={item.id} style={s.itemRow}>
                        <span style={{ ...s.statusDot, backgroundColor: STATUS_COLORS[item.status] }} />
                        <span style={s.itemDetail}>
                          {item.quantity}{item.unit ? ` ${item.unit}` : ''} - {item.status}
                          {item.status === 'open' ? ` (${item.remainingPct}%)` : ''}
                        </span>
                        <span style={s.itemZone}>{STORAGE_ZONE_LABELS[item.storageZone]}</span>

                        {/* Action buttons */}
                        <div style={s.itemActions}>
                          {item.status === 'sealed' && (
                            <button style={s.actionBtn} onClick={() => markOpen(item.id)} title="Mark as open">
                              Open
                            </button>
                          )}
                          {item.status === 'open' && (
                            <>
                              <button style={s.actionBtn} onClick={() => updateItem(item.id, { remainingPct: 75 })} title="75%">
                                75%
                              </button>
                              <button style={s.actionBtn} onClick={() => updateItem(item.id, { remainingPct: 50 })} title="50%">
                                50%
                              </button>
                              <button style={s.actionBtn} onClick={() => updateItem(item.id, { remainingPct: 25 })} title="25%">
                                25%
                              </button>
                            </>
                          )}
                          {item.status !== 'expired' && (
                            <button
                              style={{ ...s.actionBtn, color: '#ff6b6b' }}
                              onClick={() => markExpired(item.id)}
                              title="Mark expired"
                            >
                              Exp
                            </button>
                          )}
                          <button
                            style={{ ...s.actionBtn, color: '#ff6b6b' }}
                            onClick={() => deleteItem(item.id)}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Clear expired */}
      {expiredCount > 0 && (
        <button style={s.clearExpiredBtn} onClick={handleClearExpired}>
          Clear {expiredCount} expired item{expiredCount !== 1 ? 's' : ''}
        </button>
      )}

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleBarcodeScanned}
      />

      <ReceiptImportModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onImport={handleReceiptImport}
      />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 700, margin: '0 auto', padding: 16 },
  header: { marginBottom: 16 },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#FFBD73', fontSize: 28, fontWeight: 700, margin: 0 },
  addButton: {
    backgroundColor: '#FFBD73',
    color: '#202020',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#2a2a2a',
    color: '#FFBD73',
    border: '1px solid #FFBD73',
    borderRadius: 8,
    padding: '8px 12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
  },
  summary: { display: 'flex', gap: 16, marginTop: 8 },
  summaryItem: { color: '#aaa', fontSize: 13 },

  addForm: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  formRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 0 },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #444',
    fontSize: 14,
    outline: 'none',
    marginBottom: 10,
    boxSizing: 'border-box' as const,
    width: '100%',
  },
  zonePicker: { display: 'flex', gap: 8, marginBottom: 10, width: '100%' },
  zoneBtn: {
    flex: 1,
    padding: '8px 0',
    borderRadius: 8,
    backgroundColor: '#333',
    color: '#ccc',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
  },
  zoneBtnActive: { backgroundColor: '#FFBD73', color: '#202020', fontWeight: 600 },
  primaryBtn: {
    backgroundColor: '#FFBD73',
    color: '#202020',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },

  zoneTabs: { display: 'flex', gap: 8, marginBottom: 20 },
  zoneTab: {
    padding: '6px 14px',
    borderRadius: 16,
    backgroundColor: '#333',
    color: '#ccc',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
  },
  zoneTabActive: { backgroundColor: '#FFBD73', color: '#202020', fontWeight: 600 },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },

  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 14,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    marginBottom: 8,
  },
  cardName: { color: '#fff', fontSize: 16, fontWeight: 600 },
  cardQty: { color: '#aaa', fontSize: 13 },
  expandIcon: { color: '#888', fontSize: 16 },

  badges: { display: 'flex', gap: 6, marginBottom: 8 },
  badge: {
    padding: '2px 8px',
    borderRadius: 10,
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
  },

  progressBar: {
    height: 18,
    backgroundColor: '#444',
    borderRadius: 9,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFBD73',
    borderRadius: 9,
  },
  progressText: {
    position: 'relative',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
    textAlign: 'center',
    lineHeight: '18px',
  },

  expirationText: { color: '#ff6b6b', fontSize: 12, margin: '0 0 6px 0' },

  itemList: { borderTop: '1px solid #333', marginTop: 8, paddingTop: 8 },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    borderBottom: '1px solid #333',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  itemDetail: { color: '#ccc', fontSize: 13, flex: 1 },
  itemZone: { color: '#888', fontSize: 11 },
  itemActions: { display: 'flex', gap: 4 },
  actionBtn: {
    background: 'none',
    border: '1px solid #555',
    borderRadius: 4,
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 11,
    padding: '2px 6px',
  },

  clearExpiredBtn: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#333',
    color: '#ff6b6b',
    border: 'none',
    borderRadius: 8,
    padding: 14,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },

  emptyText: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 15 },
};
