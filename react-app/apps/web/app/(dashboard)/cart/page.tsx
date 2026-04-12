'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useHouseholdStore, useShoppingCartStore } from '../../providers';

export default function CartPage() {
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
  const [newHouseholdName, setNewHouseholdName] = useState('');

  useEffect(() => {
    fetchHouseholds();
  }, []);

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
  }, [newHouseholdName, createHousehold]);

  const handleClearChecked = useCallback(() => {
    if (!activeHouseholdId) return;
    if (window.confirm('Remove all checked items from the cart?')) {
      clearChecked(activeHouseholdId);
    }
  }, [activeHouseholdId, clearChecked]);

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  // No households — create one first
  if (!hhLoading && households.length === 0) {
    return (
      <div style={pageStyles.container}>
        <h1 style={pageStyles.title}>Shopping Cart</h1>
        <p style={pageStyles.emptyText}>
          Create a household to start sharing a shopping cart with your family.
        </p>
        <div style={pageStyles.createForm}>
          <input
            style={pageStyles.input}
            placeholder="Household name (e.g. Smith Family)"
            value={newHouseholdName}
            onChange={(e) => setNewHouseholdName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateHousehold()}
          />
          <button style={pageStyles.primaryButton} onClick={handleCreateHousehold}>
            Create Household
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyles.container}>
      {/* Header */}
      <div style={pageStyles.header}>
        <h1 style={pageStyles.title}>Shopping Cart</h1>
        {households.length > 1 && (
          <div style={pageStyles.householdPicker}>
            {households.map((hh) => (
              <button
                key={hh.id}
                style={{
                  ...pageStyles.chip,
                  ...(hh.id === activeHouseholdId ? pageStyles.chipActive : {}),
                }}
                onClick={() => setActiveHousehold(hh.id)}
              >
                {hh.name}
              </button>
            ))}
          </div>
        )}
        {households.length === 1 && (
          <p style={pageStyles.householdName}>{households[0].name}</p>
        )}
        <p style={pageStyles.memberCount}>
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Add item */}
      <div style={pageStyles.addRow}>
        <input
          style={pageStyles.addInput}
          placeholder="Add an item..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <button
          style={{
            ...pageStyles.addButton,
            ...(!newItemName.trim() ? pageStyles.addButtonDisabled : {}),
          }}
          onClick={handleAddItem}
          disabled={!newItemName.trim()}
        >
          + Add
        </button>
      </div>

      {/* Cart items */}
      {cartLoading ? (
        <p style={pageStyles.emptyText}>Loading...</p>
      ) : items.length === 0 ? (
        <p style={pageStyles.emptyText}>Your cart is empty. Add items above!</p>
      ) : (
        <div style={pageStyles.list}>
          {uncheckedItems.map((item) => (
            <div key={item.id} style={pageStyles.itemRow}>
              <button
                style={{
                  ...pageStyles.checkbox,
                  ...(item.checked ? pageStyles.checkboxChecked : {}),
                }}
                onClick={() => toggleItem(item.id)}
              >
                {item.checked && '✓'}
              </button>
              <div style={pageStyles.itemInfo}>
                <span style={pageStyles.itemName}>{item.name}</span>
                {(item.quantity > 1 || item.unit) && (
                  <span style={pageStyles.itemDetail}>
                    {' '}{item.quantity}{item.unit ? ` ${item.unit}` : ''}
                  </span>
                )}
                {item.addedByName && item.addedBy !== userId && (
                  <span style={pageStyles.addedBy}> - {item.addedByName}</span>
                )}
              </div>
              <button style={pageStyles.deleteButton} onClick={() => deleteItem(item.id)}>
                ✕
              </button>
            </div>
          ))}

          {checkedItems.length > 0 && uncheckedItems.length > 0 && (
            <hr style={pageStyles.divider} />
          )}

          {checkedItems.map((item) => (
            <div key={item.id} style={{ ...pageStyles.itemRow, opacity: 0.5 }}>
              <button
                style={{ ...pageStyles.checkbox, ...pageStyles.checkboxChecked }}
                onClick={() => toggleItem(item.id)}
              >
                ✓
              </button>
              <div style={pageStyles.itemInfo}>
                <span style={{ ...pageStyles.itemName, textDecoration: 'line-through', color: '#888' }}>
                  {item.name}
                </span>
              </div>
              <button style={pageStyles.deleteButton} onClick={() => deleteItem(item.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Clear checked */}
      {checkedItems.length > 0 && (
        <button style={pageStyles.clearButton} onClick={handleClearChecked}>
          Clear {checkedItems.length} checked item{checkedItems.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

const pageStyles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 600, margin: '0 auto', padding: 16 },
  header: { marginBottom: 24 },
  title: { color: '#FFBD73', fontSize: 28, fontWeight: 700, margin: '0 0 8px 0' },
  householdName: { color: '#ccc', fontSize: 14, margin: '0 0 4px 0' },
  memberCount: { color: '#888', fontSize: 12, margin: 0 },
  householdPicker: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  chip: {
    padding: '6px 12px',
    borderRadius: 16,
    backgroundColor: '#333',
    color: '#ccc',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
  },
  chipActive: { backgroundColor: '#FFBD73', color: '#202020', fontWeight: 600 },

  addRow: { display: 'flex', gap: 8, marginBottom: 24 },
  addInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #444',
    fontSize: 15,
    outline: 'none',
  },
  addButton: {
    backgroundColor: '#FFBD73',
    color: '#202020',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  addButtonDisabled: { opacity: 0.4, cursor: 'default' },

  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    border: '2px solid #666',
    backgroundColor: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
    padding: 0,
  },
  checkboxChecked: { backgroundColor: '#4DB6AC', borderColor: '#4DB6AC' },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 15 },
  itemDetail: { color: '#aaa', fontSize: 12 },
  addedBy: { color: '#888', fontSize: 11 },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: 16,
    padding: 8,
  },
  divider: { border: 'none', borderTop: '1px solid #333', margin: '8px 0' },

  clearButton: {
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
  createForm: { maxWidth: 400, margin: '0 auto' },
  input: {
    width: '100%',
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #444',
    marginBottom: 16,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#FFBD73',
    color: '#202020',
    border: 'none',
    borderRadius: 8,
    padding: 14,
    fontWeight: 600,
    fontSize: 16,
    cursor: 'pointer',
  },
};
