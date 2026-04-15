import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { useHouseholdStore, usePantryStore } from '../../hooks/useStores';
import {
  STORAGE_ZONES,
  STORAGE_ZONE_LABELS,
  aggregatePantryItems,
  lookupBarcode,
  type StorageZone,
  type ItemStatus,
  type PantryItemDraft,
} from '@fuelify/shared';
import { BarcodeScanner } from '../../components/BarcodeScanner';
import { ReceiptImportModal } from '../../components/ReceiptImportModal';
import { MealSuggestionsModal } from '../../components/MealSuggestionsModal';

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

export default function PantryScreen() {
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

  // Add item modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState<string | undefined>(undefined);
  const [newZone, setNewZone] = useState<StorageZone>('dry');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('');

  // Scanner / receipt state
  const [fabOpen, setFabOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);

  useEffect(() => {
    fetchHouseholds();
  }, []);

  useEffect(() => {
    if (activeHouseholdId) fetchItems(activeHouseholdId);
  }, [activeHouseholdId]);

  // Filter items by active zone
  const filteredItems = useMemo(() => {
    if (activeZone === 'all') return items;
    return items.filter((i) => i.storageZone === activeZone);
  }, [items, activeZone]);

  // Aggregate totals
  const totals = useMemo(() => aggregatePantryItems(filteredItems), [filteredItems]);

  // Summary counts
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
      try {
        const info = await lookupBarcode(barcode);
        if (!info) {
          Alert.alert('Not found', `No product found for barcode ${barcode}. You can still add it manually.`);
          resetAddForm();
          setNewName('');
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
        Alert.alert('Lookup failed', (e as Error).message);
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
    Alert.alert('Clear Expired', 'Remove all expired items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearExpired(activeHouseholdId) },
    ]);
  }, [activeHouseholdId, clearExpired]);

  const handleItemAction = useCallback((item: typeof items[0]) => {
    const actions: Array<{ text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }> = [];

    if (item.status === 'sealed') {
      actions.push({ text: 'Mark as Open', onPress: () => markOpen(item.id) });
    }
    if (item.status !== 'expired') {
      actions.push({ text: 'Mark as Expired', style: 'destructive', onPress: () => markExpired(item.id) });
    }
    if (item.status === 'open') {
      actions.push({ text: '75% left', onPress: () => updateItem(item.id, { remainingPct: 75 }) });
      actions.push({ text: '50% left', onPress: () => updateItem(item.id, { remainingPct: 50 }) });
      actions.push({ text: '25% left', onPress: () => updateItem(item.id, { remainingPct: 25 }) });
    }
    actions.push({ text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) });
    actions.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(item.name, `${item.quantity}${item.unit ? ` ${item.unit}` : ''} - ${item.status}`, actions);
  }, [markOpen, markExpired, updateItem, deleteItem]);

  if (!hhLoading && households.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Pantry</Text>
        <Text style={styles.emptyText}>
          Create a household first (go to Cart tab) to start tracking your pantry.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Pantry</Text>
        <TouchableOpacity
          style={[styles.suggestBtn, items.length === 0 && { opacity: 0.5 }]}
          onPress={() => setSuggestionsOpen(true)}
          disabled={items.length === 0}
        >
          <Text style={styles.suggestBtnText}>🍽️ Meal Ideas</Text>
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{items.length} items</Text>
        {openCount > 0 && (
          <Text style={[styles.summaryText, { color: '#FFBD73' }]}>{openCount} open</Text>
        )}
        {expiredCount > 0 && (
          <Text style={[styles.summaryText, { color: '#ff6b6b' }]}>{expiredCount} expired</Text>
        )}
      </View>

      {/* Zone tabs */}
      <View style={styles.zoneTabs}>
        {ZONE_TABS.map((zone) => (
          <TouchableOpacity
            key={zone}
            style={[styles.zoneTab, activeZone === zone && styles.zoneTabActive]}
            onPress={() => setActiveZone(zone)}
          >
            <Text style={[styles.zoneTabText, activeZone === zone && styles.zoneTabTextActive]}>
              {ZONE_TAB_LABELS[zone]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Items list — grouped by name (totals) */}
      <FlatList
        data={totals}
        keyExtractor={(t) => t.name}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isLoading ? 'Loading...' : 'No items in this section.'}
          </Text>
        }
        renderItem={({ item: total }) => (
          <View style={styles.totalCard}>
            <View style={styles.totalHeader}>
              <Text style={styles.totalName}>{total.name}</Text>
              <Text style={styles.totalQty}>
                {total.totalQuantity}{total.unit ? ` ${total.unit}` : ''}{' '}
                {total.itemCount > 1 ? `(${total.itemCount})` : ''}
              </Text>
            </View>

            {/* Status badges */}
            <View style={styles.badgeRow}>
              {total.sealedCount > 0 && (
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS.sealed }]}>
                  <Text style={styles.badgeText}>{total.sealedCount} sealed</Text>
                </View>
              )}
              {total.openCount > 0 && (
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS.open }]}>
                  <Text style={styles.badgeText}>{total.openCount} open</Text>
                </View>
              )}
              {total.expiredCount > 0 && (
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS.expired }]}>
                  <Text style={styles.badgeText}>{total.expiredCount} expired</Text>
                </View>
              )}
            </View>

            {/* Remaining % bar for open items */}
            {total.openCount > 0 && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${total.avgRemainingPct}%` },
                  ]}
                />
                <Text style={styles.progressText}>{total.avgRemainingPct}% remaining</Text>
              </View>
            )}

            {/* Expiration warning */}
            {total.earliestExpiration && (
              <Text style={styles.expirationText}>
                Expires: {total.earliestExpiration}
              </Text>
            )}

            {/* Individual items */}
            {total.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => handleItemAction(item)}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]}
                />
                <Text style={styles.itemDetail}>
                  {item.quantity}{item.unit ? ` ${item.unit}` : ''} - {item.status}
                  {item.status === 'open' ? ` (${item.remainingPct}%)` : ''}
                </Text>
                <Text style={styles.itemZone}>
                  {STORAGE_ZONE_LABELS[item.storageZone]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      {/* Expandable FAB — manual / barcode / receipt */}
      {fabOpen && (
        <>
          <TouchableOpacity
            style={[styles.fabSecondary, { bottom: 260 }]}
            onPress={() => {
              setFabOpen(false);
              setReceiptOpen(true);
            }}
          >
            <Text style={styles.fabSecondaryText}>🧾 Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabSecondary, { bottom: 200 }]}
            onPress={() => {
              setFabOpen(false);
              setScannerOpen(true);
            }}
          >
            <Text style={styles.fabSecondaryText}>📷 Barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabSecondary, { bottom: 140 }]}
            onPress={() => {
              setFabOpen(false);
              resetAddForm();
              setShowAdd(true);
            }}
          >
            <Text style={styles.fabSecondaryText}>✏️ Manual</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setFabOpen((v) => !v)}
        disabled={lookupBusy}
      >
        <Text style={styles.fabText}>{fabOpen ? '×' : '+'}</Text>
      </TouchableOpacity>

      {/* Clear expired */}
      {expiredCount > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClearExpired}>
          <Text style={styles.clearButtonText}>Clear {expiredCount} expired</Text>
        </TouchableOpacity>
      )}

      {/* Add item modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Pantry Item</Text>

            <TextInput
              style={styles.input}
              placeholder="Item name"
              placeholderTextColor="#888"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <TextInput
              style={styles.input}
              placeholder="Brand (optional)"
              placeholderTextColor="#888"
              value={newBrand}
              onChangeText={setNewBrand}
            />

            {newCategory ? (
              <Text style={styles.categoryTag}>Category: {newCategory}</Text>
            ) : null}

            {/* Zone selector */}
            <Text style={styles.label}>Storage</Text>
            <View style={styles.zonePicker}>
              {STORAGE_ZONES.map((z) => (
                <TouchableOpacity
                  key={z}
                  style={[styles.zoneOption, newZone === z && styles.zoneOptionActive]}
                  onPress={() => setNewZone(z)}
                >
                  <Text style={[styles.zoneOptionText, newZone === z && styles.zoneOptionTextActive]}>
                    {STORAGE_ZONE_LABELS[z]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quantity + unit */}
            <View style={styles.qtyRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Qty"
                placeholderTextColor="#888"
                value={newQuantity}
                onChangeText={setNewQuantity}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Unit (e.g. lbs, bags)"
                placeholderTextColor="#888"
                value={newUnit}
                onChangeText={setNewUnit}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAdd(false);
                  resetAddForm();
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, !newName.trim() && { opacity: 0.4 }]}
                onPress={handleAdd}
                disabled={!newName.trim()}
              >
                <Text style={styles.primaryButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barcode scanner */}
      <BarcodeScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleBarcodeScanned}
      />

      {/* Receipt import */}
      <ReceiptImportModal
        visible={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onImport={handleReceiptImport}
      />

      {/* AI meal suggestions */}
      <MealSuggestionsModal
        visible={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        pantryItems={items}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#202020', padding: 16 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { color: '#FFBD73', fontSize: 28, fontWeight: '700' },
  suggestBtn: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#4DB6AC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  suggestBtnText: { color: '#4DB6AC', fontSize: 13, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  summaryText: { color: '#aaa', fontSize: 13 },

  zoneTabs: { flexDirection: 'row', marginBottom: 16, gap: 6 },
  zoneTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333',
  },
  zoneTabActive: { backgroundColor: '#FFBD73' },
  zoneTabText: { color: '#ccc', fontSize: 13 },
  zoneTabTextActive: { color: '#202020', fontWeight: '600' },

  list: { paddingBottom: 100 },

  totalCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  totalQty: { color: '#aaa', fontSize: 13 },

  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  progressBar: {
    height: 18,
    backgroundColor: '#444',
    borderRadius: 9,
    overflow: 'hidden',
    marginBottom: 8,
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFBD73',
    borderRadius: 9,
  },
  progressText: { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center' },

  expirationText: { color: '#ff6b6b', fontSize: 12, marginBottom: 6 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  itemDetail: { color: '#ccc', fontSize: 13, flex: 1 },
  itemZone: { color: '#888', fontSize: 11 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFBD73',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: '#202020', fontSize: 28, fontWeight: '700', marginTop: -2 },
  fabSecondary: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#FFBD73',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabSecondaryText: { color: '#FFBD73', fontWeight: '600', fontSize: 13 },
  categoryTag: { color: '#4DB6AC', fontSize: 12, marginBottom: 10 },

  clearButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 80,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: { color: '#ff6b6b', fontWeight: '600', fontSize: 13 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
    fontSize: 15,
  },
  zonePicker: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  zoneOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  zoneOptionActive: { backgroundColor: '#FFBD73' },
  zoneOptionText: { color: '#ccc', fontSize: 13 },
  zoneOptionTextActive: { color: '#202020', fontWeight: '600' },
  qtyRow: { flexDirection: 'row', gap: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#444',
    alignItems: 'center',
  },
  cancelText: { color: '#ccc', fontWeight: '600', fontSize: 15 },
  primaryButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#FFBD73',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#202020', fontWeight: '600', fontSize: 15 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
