import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useHouseholdStore, useShoppingCartStore, useAuthStore } from '../../hooks/useStores';
import { CART_CATEGORIES } from '@fuelify/shared';

export default function CartScreen() {
  const userId = useAuthStore((s) => s.userId);

  // Household state
  const households = useHouseholdStore((s) => s.households);
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const members = useHouseholdStore((s) => s.members);
  const fetchHouseholds = useHouseholdStore((s) => s.fetchHouseholds);
  const createHousehold = useHouseholdStore((s) => s.createHousehold);
  const setActiveHousehold = useHouseholdStore((s) => s.setActiveHousehold);
  const hhLoading = useHouseholdStore((s) => s.isLoading);

  // Cart state
  const items = useShoppingCartStore((s) => s.items);
  const fetchItems = useShoppingCartStore((s) => s.fetchItems);
  const addItem = useShoppingCartStore((s) => s.addItem);
  const toggleItem = useShoppingCartStore((s) => s.toggleItem);
  const deleteItem = useShoppingCartStore((s) => s.deleteItem);
  const clearChecked = useShoppingCartStore((s) => s.clearChecked);
  const cartLoading = useShoppingCartStore((s) => s.isLoading);

  // Local form state
  const [newItemName, setNewItemName] = useState('');
  const [showHouseholdCreate, setShowHouseholdCreate] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');

  // Load households on mount
  useEffect(() => {
    fetchHouseholds();
  }, []);

  // Load cart items when active household changes
  useEffect(() => {
    if (activeHouseholdId) {
      fetchItems(activeHouseholdId);
    }
  }, [activeHouseholdId]);

  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim() || !activeHouseholdId) return;
    await addItem(activeHouseholdId, { name: newItemName.trim() });
    setNewItemName('');
  }, [newItemName, activeHouseholdId, addItem]);

  const handleCreateHousehold = useCallback(async () => {
    if (!newHouseholdName.trim()) return;
    await createHousehold(newHouseholdName.trim());
    setNewHouseholdName('');
    setShowHouseholdCreate(false);
  }, [newHouseholdName, createHousehold]);

  const handleClearChecked = useCallback(() => {
    if (!activeHouseholdId) return;
    Alert.alert(
      'Clear Checked Items',
      'Remove all checked items from the cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearChecked(activeHouseholdId) },
      ],
    );
  }, [activeHouseholdId, clearChecked]);

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  // No households yet — prompt to create one
  if (!hhLoading && households.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Shopping Cart</Text>
        <Text style={styles.emptyText}>
          Create a household to start sharing a shopping cart with your family.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Household name (e.g. Smith Family)"
          placeholderTextColor="#888"
          value={newHouseholdName}
          onChangeText={setNewHouseholdName}
          onSubmitEditing={handleCreateHousehold}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreateHousehold}>
          <Text style={styles.primaryButtonText}>Create Household</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Shopping Cart</Text>
        {households.length > 1 && (
          <View style={styles.householdPicker}>
            {households.map((hh) => (
              <TouchableOpacity
                key={hh.id}
                style={[
                  styles.householdChip,
                  hh.id === activeHouseholdId && styles.householdChipActive,
                ]}
                onPress={() => setActiveHousehold(hh.id)}
              >
                <Text
                  style={[
                    styles.householdChipText,
                    hh.id === activeHouseholdId && styles.householdChipTextActive,
                  ]}
                >
                  {hh.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {households.length === 1 && (
          <Text style={styles.householdName}>{households[0].name}</Text>
        )}
        <Text style={styles.memberCount}>
          {members.length} member{members.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Add item */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Add an item..."
          placeholderTextColor="#888"
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, !newItemName.trim() && styles.addButtonDisabled]}
          onPress={handleAddItem}
          disabled={!newItemName.trim()}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Cart items */}
      <FlatList
        data={[...uncheckedItems, ...checkedItems]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {cartLoading ? 'Loading...' : 'Your cart is empty. Add items above!'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.itemRow, item.checked && styles.itemRowChecked]}>
            <TouchableOpacity
              style={[styles.checkbox, item.checked && styles.checkboxChecked]}
              onPress={() => toggleItem(item.id)}
            >
              {item.checked && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                {item.name}
              </Text>
              {(item.quantity > 1 || item.unit) && (
                <Text style={styles.itemDetail}>
                  {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                </Text>
              )}
              {item.addedByName && item.addedBy !== userId && (
                <Text style={styles.addedBy}>Added by {item.addedByName}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteItem(item.id)}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => (
          uncheckedItems.length > 0 && checkedItems.length > 0
            ? null
            : null
        )}
      />

      {/* Footer actions */}
      {checkedItems.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClearChecked}>
          <Text style={styles.clearButtonText}>
            Clear {checkedItems.length} checked item{checkedItems.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#202020', padding: 16 },
  header: { marginBottom: 16 },
  title: { color: '#FFBD73', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  householdName: { color: '#ccc', fontSize: 14, marginBottom: 4 },
  memberCount: { color: '#888', fontSize: 12 },
  householdPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  householdChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333',
  },
  householdChipActive: { backgroundColor: '#FFBD73' },
  householdChipText: { color: '#ccc', fontSize: 13 },
  householdChipTextActive: { color: '#202020', fontWeight: '600' },

  addRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  addInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    fontSize: 15,
  },
  addButton: {
    backgroundColor: '#FFBD73',
    width: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { color: '#202020', fontSize: 22, fontWeight: '700' },

  list: { paddingBottom: 80 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemRowChecked: { opacity: 0.6 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#4DB6AC', borderColor: '#4DB6AC' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 15 },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#888' },
  itemDetail: { color: '#aaa', fontSize: 12, marginTop: 2 },
  addedBy: { color: '#888', fontSize: 11, marginTop: 2 },
  deleteButton: { padding: 8 },
  deleteText: { color: '#666', fontSize: 16 },

  clearButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: { color: '#ff6b6b', fontWeight: '600', fontSize: 14 },

  emptyText: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 15 },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#444',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#FFBD73',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#202020', fontWeight: '600', fontSize: 16 },
});
