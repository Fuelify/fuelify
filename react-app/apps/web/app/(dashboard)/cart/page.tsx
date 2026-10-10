'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CartItem } from '@fuelify/shared';
import { useAuthStore, useHouseholdStore, usePantryStore, useShoppingCartStore } from '@/lib/stores';
import { EmptyState, Icon, LoadingBlock, PageHeader } from '@/components/ui';

// Shared household shopping list. Checked items can be moved straight into the pantry.
export default function CartPage() {
  const userId = useAuthStore((s) => s.userId);

  const households = useHouseholdStore((s) => s.households);
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const hhError = useHouseholdStore((s) => s.error);

  const items = useShoppingCartStore((s) => s.items);
  const fetchItems = useShoppingCartStore((s) => s.fetchItems);
  const addItem = useShoppingCartStore((s) => s.addItem);
  const toggleItem = useShoppingCartStore((s) => s.toggleItem);
  const deleteItem = useShoppingCartStore((s) => s.deleteItem);
  const clearChecked = useShoppingCartStore((s) => s.clearChecked);
  const cartLoading = useShoppingCartStore((s) => s.isLoading);
  const cartError = useShoppingCartStore((s) => s.error);
  const addPantryItems = usePantryStore((s) => s.addItems);

  const [newItem, setNewItem] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    ensureHousehold().finally(() => setStarted(true));
  }, [ensureHousehold]);

  useEffect(() => {
    if (activeHouseholdId) fetchItems(activeHouseholdId);
  }, [activeHouseholdId, fetchItems]);

  const household = households.find((h) => h.id === activeHouseholdId);
  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim() || !activeHouseholdId) return;
    const name = newItem.trim();
    setNewItem('');
    await addItem(activeHouseholdId, { name });
  };

  const moveCheckedToPantry = async () => {
    if (!activeHouseholdId || checked.length === 0) return;
    setBusy(true);
    await addPantryItems(
      activeHouseholdId,
      checked.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit ?? undefined, category: i.category ?? undefined })),
    );
    await clearChecked(activeHouseholdId);
    setBusy(false);
  };

  if (!started || (!activeHouseholdId && !hhError)) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        title="Cart"
        sub={household ? household.name : undefined}
        right={
          <Link href="/household" className="icon-btn icon-btn-filled" aria-label="Manage household">
            <Icon name="users" size={20} />
          </Link>
        }
      />

      <form onSubmit={handleAdd} className="row" style={{ padding: '0 var(--gutter) 12px', flexShrink: 0 }}>
        <input className="input" placeholder="Add an item…" value={newItem} onChange={(e) => setNewItem(e.target.value)} aria-label="New item" />
        <button type="submit" className="btn btn-primary" disabled={!newItem.trim()} aria-label="Add item" style={{ padding: '0 14px' }}>
          <Icon name="plus" />
        </button>
      </form>

      <div className="screen-scroll">
        <div className="screen-pad stack" style={{ paddingTop: 0, paddingBottom: 32 }}>
          {(cartError || hhError) && <div className="alert">{cartError ?? hhError}</div>}

          {cartLoading && items.length === 0 ? (
            <LoadingBlock />
          ) : items.length === 0 ? (
            <EmptyState icon="cart" title="Your cart is empty">
              Add items above, or add a recipe&apos;s ingredients from Discover.
            </EmptyState>
          ) : (
            <>
              {unchecked.length > 0 && (
                <div className="list">
                  {unchecked.map((item) => (
                    <CartRow key={item.id} item={item} userId={userId} onToggle={() => toggleItem(item.id)} onDelete={() => deleteItem(item.id)} />
                  ))}
                </div>
              )}

              {checked.length > 0 && (
                <>
                  <div className="section-title" style={{ marginBottom: 0 }}>
                    <span>In the cart · {checked.length}</span>
                  </div>
                  <div className="list">
                    {checked.map((item) => (
                      <CartRow key={item.id} item={item} userId={userId} onToggle={() => toggleItem(item.id)} onDelete={() => deleteItem(item.id)} />
                    ))}
                  </div>
                  <div className="row">
                    <button className="btn btn-secondary grow" disabled={busy}
                      onClick={() => activeHouseholdId && window.confirm('Remove all checked items from the cart?') && clearChecked(activeHouseholdId)}>
                      Clear checked
                    </button>
                    <button className="btn btn-primary grow" disabled={busy} onClick={moveCheckedToPantry}>
                      <Icon name="pantry" /> {busy ? 'Moving…' : 'Move to pantry'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

    </>
  );
}

function CartRow({ item, userId, onToggle, onDelete }: { item: CartItem; userId: string | null; onToggle: () => void; onDelete: () => void }) {
  const detail = [
    item.unit ? `${item.quantity} ${item.unit}` : item.quantity !== 1 ? `×${item.quantity}` : null,
    item.addedByName && item.addedBy !== userId ? `added by ${item.addedByName}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <div className="list-row" style={{ paddingRight: 4 }}>
      <button
        onClick={onToggle}
        aria-label={item.checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          border: `2px solid ${item.checked ? 'var(--accent)' : 'var(--text-3)'}`,
          background: item.checked ? 'var(--accent)' : 'transparent', color: 'var(--on-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {item.checked && <Icon name="check" size={16} />}
      </button>
      <button className="grow" onClick={onToggle} style={{ textAlign: 'left', minWidth: 0 }}>
        <div className="truncate" style={{ fontWeight: 600, textDecoration: item.checked ? 'line-through' : undefined, color: item.checked ? 'var(--text-3)' : undefined }}>
          {item.name}
        </div>
        {detail && <div className="tiny faint truncate">{detail}</div>}
      </button>
      <button className="icon-btn" aria-label={`Delete ${item.name}`} onClick={onDelete}>
        <Icon name="trash" size={18} />
      </button>
    </div>
  );
}
