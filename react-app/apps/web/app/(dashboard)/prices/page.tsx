'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { compareStores, formatAmounts, pricesForItem, type PricePoint } from '@fuelify/shared';
import { useAuthStore, useGroceryStore, useHouseholdStore, usePriceBookStore, useShoppingCartStore } from '@/lib/stores';
import { usePlan } from '@/features/premium/usePlan';
import { usePriceBook } from '@/features/prices/usePriceBook';
import { LogPriceSheet } from '@/features/prices/LogPriceSheet';
import { ReceiptImportSheet } from '@/features/pantry/ReceiptImportSheet';
import { listDates } from '@/features/grocery/ShoppingListView';
import { VoiceButton } from '@/features/voice/VoiceButton';
import { EmptyState, Icon, LoadingBlock, PageHeader } from '@/components/ui';

const usd = (n: number) => `$${n.toFixed(2)}`;
const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const BASIS: Record<PricePoint['basis'], string> = { yours: 'You paid', nearby: 'Nearby', national: 'Typical' };

/**
 * Prices: what things cost at the stores you shop, from your receipts and
 * prices you log, plus what other Fuelify households nearby paid.
 */
export default function PricesPage() {
  const userId = useAuthStore((s) => s.userId);
  const { householdId, ready } = usePriceBook();
  const household = useHouseholdStore((s) => s.households.find((h) => h.id === s.activeHouseholdId));
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const own = usePriceBookStore((s) => s.own);
  const points = usePriceBookStore((s) => s.points);
  const loading = usePriceBookStore((s) => s.loading);
  const error = usePriceBookStore((s) => s.error);
  const loadCommunity = usePriceBookStore((s) => s.loadCommunity);
  const remove = usePriceBookStore((s) => s.remove);

  const cartItems = useShoppingCartStore((s) => s.items);
  const fetchItems = useShoppingCartStore((s) => s.fetchItems);
  const planList = useGroceryStore((s) => s.list);
  const loadList = useGroceryStore((s) => s.loadList);
  const { premium } = usePlan();

  const [query, setQuery] = useState('');
  const [looked, setLooked] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    ensureHousehold();
  }, [ensureHousehold]);
  useEffect(() => {
    if (!householdId) return;
    fetchItems(householdId);
    if (premium && !planList) loadList(householdId, listDates());
  }, [householdId, premium]); // eslint-disable-line react-hooks/exhaustive-deps

  // This week's list: hand-added items still to get, plus the meal plan's (not in pantry or skipped)
  const listItems = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; amount: string | null }[] = [];
    const add = (name: string, amount: string | null) => {
      const k = name.trim().toLowerCase();
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push({ name: name.trim(), amount });
    };
    cartItems.filter((i) => !i.checked).forEach((i) => add(i.name, i.unit ? `${i.quantity} ${i.unit}` : null));
    if (planList && planList.householdId === householdId) {
      planList.items.filter((i) => !i.inPantry && !planList.skipped.includes(i.key)).forEach((i) => add(i.name, formatAmounts(i.amounts) || null));
    }
    return out;
  }, [cartItems, planList, householdId]);

  const listNames = listItems.map((i) => i.name).join('|');
  useEffect(() => {
    if (ready && listNames) loadCommunity(listNames.split('|'));
  }, [ready, listNames, loadCommunity]);

  const ranked = useMemo(() => compareStores(listItems, points), [listItems, points]);
  const results = looked ? pricesForItem(looked, points) : [];

  const lookUp = async (q: string) => {
    const term = q.trim();
    setLooked(term);
    if (term) await loadCommunity([term]);
  };

  if (!household) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        title="Prices"
        sub="What things cost where you shop"
        right={
          <Link href="/cart" className="icon-btn icon-btn-filled" aria-label="Back to Cart">
            <Icon name="cart" size={20} />
          </Link>
        }
      />
      <div className="screen-scroll">
        <div className="screen-pad stack" style={{ paddingTop: 0, paddingBottom: 32 }}>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary grow" onClick={() => setReceiptOpen(true)}><Icon name="receipt" size={18} /> Scan a receipt</button>
            <button className="btn btn-secondary grow" onClick={() => setLogOpen(true)}><Icon name="plus" size={18} /> Log a price</button>
          </div>
          {error && <div className="alert" role="alert">{error}</div>}

          <section className="stack-sm">
            <div className="section-title" style={{ margin: 0 }}><span>Your list by store</span></div>
            {listItems.length === 0 ? (
              <p className="hint">Add items to your <Link href="/cart" style={{ color: 'var(--primary)' }}>list</Link> to compare stores.</p>
            ) : ranked.length === 0 ? (
              <p className="hint">No prices for your list yet. Scan a receipt from any store you shop at (Trader Joe’s, Aldi, Wegmans…) and prices show up here.</p>
            ) : (
              <div className="list">
                {ranked.map((r, idx) => {
                  const open = expanded === r.storeKey;
                  // Only a fair call when the top two price the same items
                  const cheapest = idx === 0 && ranked.length > 1 && ranked[0].priced === ranked[1].priced && ranked[0].sharedTotal > 0 && ranked[0].sharedTotal < ranked[1].sharedTotal;
                  return (
                    <div key={r.storeKey}>
                      <button className="list-row" style={{ width: '100%', textAlign: 'left', gap: 10 }} aria-expanded={open} onClick={() => setExpanded(open ? null : r.storeKey)}>
                        <span className="grow" style={{ minWidth: 0 }}>
                          <span className="row" style={{ gap: 8 }}>
                            <span style={{ fontWeight: 700 }}>{r.storeName}</span>
                            {cheapest && <span className="badge badge-accent">Lowest</span>}
                          </span>
                          <span className="tiny faint">{r.priced} of {listItems.length} items priced{r.missing.length ? ` · ${r.missing.length} unknown` : ''}</span>
                        </span>
                        <strong>~{usd(r.total)}</strong>
                        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={18} />
                      </button>
                      {open && (
                        <div className="stack-sm" style={{ padding: '4px 12px 12px' }}>
                          {r.lines.map((l) => (
                            <div key={l.name} className="row-between small">
                              <span className="truncate" style={{ textTransform: 'capitalize', color: l.point ? undefined : 'var(--text-3)' }}>{l.name}</span>
                              <span className={l.point ? '' : 'faint'}>{l.point ? `${usd(l.point.price)} · ${BASIS[l.point.basis].toLowerCase()}` : 'no price'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {ranked.length > 0 && <p className="tiny faint">Estimates for one of each item. Stores are ranked by how many items they have prices for, then by cost on the items they share.</p>}
          </section>

          <section className="stack-sm">
            <div className="section-title" style={{ margin: 0 }}><span>Look up an item</span></div>
            <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); lookUp(query); }}>
              <input className="input" type="search" placeholder="e.g. eggs" aria-label="Look up an item's prices" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="btn btn-secondary" aria-label="Look up" disabled={!query.trim()}><Icon name="search" size={18} /></button>
              <VoiceButton label="Look up by voice" onText={(q) => { setQuery(q); lookUp(q); }} />
            </form>
            {looked && (
              results.length === 0 ? (
                <p className="hint">No prices for “{looked}” yet. <button className="btn btn-ghost btn-sm" onClick={() => setLogOpen(true)}>Log one</button></p>
              ) : (
                <div className="list">
                  {results.map((p) => (
                    <div key={p.storeKey} className="list-row" style={{ gap: 10 }}>
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 600 }}>{p.storeName}</span>
                        <span className="tiny faint">{[BASIS[p.basis], p.size, p.productName, `${p.count} price${p.count === 1 ? '' : 's'}`, shortDate(p.lastSeen)].filter(Boolean).join(' · ')}</span>
                      </span>
                      <strong>{usd(p.price)}</strong>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>

          <section className="stack-sm">
            <div className="section-title" style={{ margin: 0 }}><span>Recent prices · {own.length}</span></div>
            {loading && own.length === 0 ? (
              <LoadingBlock />
            ) : own.length === 0 ? (
              <EmptyState icon="receipt" title="No prices yet">
                Scan your next grocery receipt. Every item and what you paid is saved, for any store, so Fuelify can compare stores for your list.
              </EmptyState>
            ) : (
              <div className="list">
                {own.slice(0, 60).map((o) => (
                  <div key={o.id} className="list-row" style={{ gap: 10 }}>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="truncate" style={{ display: 'block', fontWeight: 600, textTransform: 'capitalize' }}>{o.itemName}</span>
                      <span className="tiny faint truncate" style={{ display: 'block' }}>{[o.storeName, o.size, shortDate(o.observedOn), o.source === 'receipt' ? 'receipt' : 'logged'].filter(Boolean).join(' · ')}</span>
                    </span>
                    <strong>{usd(o.price)}</strong>
                    {o.userId === userId && (
                      <button className="icon-btn" aria-label={`Delete ${o.itemName} price`} onClick={() => window.confirm('Delete this price?') && remove(o.id)}>
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="tiny faint">
              Your household sees its own prices. Other people only ever see a store’s typical price for an item, and only once two or more households have reported it. Prices use the first 3 digits of your household’s ZIP code, never your address.
            </p>
          </section>
        </div>
      </div>
      <LogPriceSheet open={logOpen} onClose={() => setLogOpen(false)} initialItem={looked} />
      <ReceiptImportSheet open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </>
  );
}
