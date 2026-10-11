'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GROCERY_STORE_INFO, ingredientKey, offerPrice, readGroceryConfig, type CartItem, type GroceryStoreId, type ProductOffer } from '@fuelify/shared';
import { useGroceryStore, useProfileStore } from '@/lib/stores';
import { FoodTile, Icon, Sheet, Spinner } from '@/components/ui';

const usd = (n: number) => `$${n.toFixed(2)}`;

/**
 * Price the cart across the user's stores, show where to buy what (per their
 * strategy), open each store's cart, and search any product everywhere.
 */
export function BestPricesSheet({ open, onClose, items }: { open: boolean; onClose: () => void; items: CartItem[] }) {
  const profile = useProfileStore((s) => s.profile);
  const providers = useGroceryStore((s) => s.providers);
  const loadProviders = useGroceryStore((s) => s.loadProviders);
  const basket = useGroceryStore((s) => s.basket);
  const busy = useGroceryStore((s) => s.busy);
  const error = useGroceryStore((s) => s.error);
  const priceBasket = useGroceryStore((s) => s.priceBasket);
  const checkout = useGroceryStore((s) => s.checkout);
  const searchProducts = useGroceryStore((s) => s.searchProducts);
  const searchResults = useGroceryStore((s) => s.searchResults);
  const config = readGroceryConfig(profile);
  const [query, setQuery] = useState('');
  const [opening, setOpening] = useState<GroceryStoreId | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!providers) loadProviders();
    priceBasket(items.map((i) => ({ key: ingredientKey(i.name), name: i.name })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const go = async (store: GroceryStoreId, list: { name: string; productId?: string }[]) => {
    setOpening(store);
    const url = await checkout(store, list.map((i) => ({ ...i, quantity: 1 })));
    setOpening(null);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const instacartReady = config.stores.includes('instacart') && providers?.instacart;
  const noStores = providers && !config.stores.some((s) => GROCERY_STORE_INFO[s].prices && providers[s]);

  return (
    <Sheet open={open} onClose={onClose} title="Best prices">
      <div className="stack">
        <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); searchProducts(query); }}>
          <input className="input" type="search" placeholder="Search all your stores…" aria-label="Search all stores" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn btn-secondary" disabled={!query.trim() || busy === 'searching'} aria-label="Search"><Icon name="search" size={18} /></button>
        </form>
        {busy === 'searching' && <div className="center"><Spinner /></div>}
        {searchResults && (
          searchResults.length === 0 ? <p className="hint">No products found.</p> : (
            <div className="list">{searchResults.slice(0, 12).map((o) => <OfferRow key={`${o.store}:${o.productId}`} offer={o} showStore />)}</div>
          )
        )}

        {noStores ? (
          <div className="alert alert-info">
            None of your stores are connected yet. Choose stores in <Link href="/profile" style={{ fontWeight: 700 }}>Profile → Grocery stores</Link>.
          </div>
        ) : busy === 'pricing' ? (
          <div className="center stack-sm" style={{ padding: 24, alignItems: 'center' }}><Spinner /><span className="small muted">Comparing {items.length} items across your stores…</span></div>
        ) : error && !basket ? (
          <div className="alert" role="alert">{error}</div>
        ) : basket ? (
          <>
            <div className="card stack-sm">
              <div className="row-between"><span className="muted">Estimated total</span><strong style={{ fontSize: 22 }}>{usd(basket.total)}</strong></div>
              {basket.dealSavings > 0 && <div className="small" style={{ color: 'var(--accent)' }}>Includes {usd(basket.dealSavings)} in deals</div>}
              {basket.vsOneStore != null && <div className="small" style={{ color: 'var(--accent)' }}>{usd(basket.vsOneStore)} less than one-store shopping</div>}
              <div className="tiny faint">Prices are estimates from each store and can change at checkout.</div>
            </div>

            {basket.stores.map((s) => (
              <section key={s.store} className="stack-sm">
                <div className="section-title" style={{ margin: 0 }}>
                  <span>{GROCERY_STORE_INFO[s.store].name} · {s.picks.length} item{s.picks.length === 1 ? '' : 's'}</span>
                  <span style={{ textTransform: 'none', letterSpacing: 0 }}>{usd(s.subtotal)}</span>
                </div>
                <div className="list">{s.picks.map((p) => <OfferRow key={p.item.key} offer={p.offer} label={p.item.name} />)}</div>
                {s.store === 'walmart' && (
                  <button className="btn btn-primary btn-block" onClick={() => go('walmart', s.picks.map((p) => ({ name: p.offer.name, productId: p.offer.productId })))} disabled={opening !== null}>
                    {opening === 'walmart' ? 'Opening…' : 'Open Walmart cart'}
                  </button>
                )}
                {s.store === 'kroger' && <p className="hint">Tap an item to open it on kroger.com. Adding to your Kroger cart directly needs a Kroger sign-in, coming next.</p>}
              </section>
            ))}

            {basket.missing.length > 0 && (
              <section className="stack-sm">
                <div className="section-title" style={{ margin: 0 }}><span>Not found at your priced stores</span></div>
                <p className="small muted">{basket.missing.map((m) => m.name).join(', ')}</p>
              </section>
            )}

            {instacartReady && (
              <div className="stack-sm">
                {basket.missing.length > 0 && (
                  <button className="btn btn-secondary btn-block" onClick={() => go('instacart', basket.missing.map((m) => ({ name: m.name })))} disabled={opening !== null}>
                    Send {basket.missing.length} missing to Instacart ({config.instacartRetailer})
                  </button>
                )}
                <button className="btn btn-secondary btn-block" onClick={() => go('instacart', items.map((i) => ({ name: i.name })))} disabled={opening !== null}>
                  {opening === 'instacart' ? 'Opening…' : `Shop whole list on Instacart (${config.instacartRetailer})`}
                </button>
              </div>
            )}
            {error && <div className="alert" role="alert">{error}</div>}
          </>
        ) : null}
      </div>
    </Sheet>
  );
}

function OfferRow({ offer, label, showStore }: { offer: ProductOffer; label?: string; showStore?: boolean }) {
  const price = offerPrice(offer);
  const deal = offer.promoPrice != null && offer.promoPrice < offer.price;
  const body = (
    <>
      <FoodTile title={offer.name} imageUrl={offer.imageUrl} size={40} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="truncate" style={{ display: 'block', fontWeight: 600 }}>{offer.name}</span>
        <span className="tiny faint truncate" style={{ display: 'block' }}>
          {[label && `for ${label}`, showStore && GROCERY_STORE_INFO[offer.store].name, offer.size, offer.organic && 'Organic'].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span style={{ textAlign: 'right', flexShrink: 0 }}>
        <strong style={{ display: 'block', color: deal ? 'var(--accent)' : undefined }}>{usd(price)}</strong>
        {deal && <span className="tiny faint" style={{ textDecoration: 'line-through' }}>{usd(offer.price)}</span>}
      </span>
    </>
  );
  return offer.url ? (
    <a className="list-row" href={offer.url} target="_blank" rel="noopener noreferrer" style={{ gap: 10 }}>{body}</a>
  ) : (
    <div className="list-row" style={{ gap: 10 }}>{body}</div>
  );
}
