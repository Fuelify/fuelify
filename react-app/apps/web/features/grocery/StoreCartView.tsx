'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GROCERY_STORE_INFO,
  offerPrice,
  readGroceryConfig,
  summarizeCart,
  type CartLine,
  type GroceryStoreId,
  type ProductOffer,
} from '@fuelify/shared';
import { useGroceryStore, useProfileStore } from '@/lib/stores';
import { FoodTile, Icon, Segmented, Sheet, Spinner } from '@/components/ui';
import { SwapOptions } from './SwapOptions';

const usd = (n: number) => `$${n.toFixed(2)}`;
const storeName = (s: GroceryStoreId) => GROCERY_STORE_INFO[s].name;

/**
 * The store cart: the list after analysis (pantry left out), priced and split
 * by store per the user's settings. Tap an item to change the product, store
 * or ingredient; nothing opens a store's site until checkout.
 */
export function StoreCartView({ premium }: { premium: boolean }) {
  const profile = useProfileStore((s) => s.profile);
  const providers = useGroceryStore((s) => s.providers);
  const loadProviders = useGroceryStore((s) => s.loadProviders);
  const list = useGroceryStore((s) => s.list);
  const cart = useGroceryStore((s) => s.cart);
  const busy = useGroceryStore((s) => s.busy);
  const error = useGroceryStore((s) => s.error);
  const buildCart = useGroceryStore((s) => s.buildCart);
  const clearCart = useGroceryStore((s) => s.clearCart);
  const checkout = useGroceryStore((s) => s.checkout);
  const searchProducts = useGroceryStore((s) => s.searchProducts);
  const searchResults = useGroceryStore((s) => s.searchResults);
  const [open, setOpen] = useState<string | null>(null);
  const [opening, setOpening] = useState<GroceryStoreId | null>(null);
  const [query, setQuery] = useState('');
  const config = readGroceryConfig(profile);

  useEffect(() => {
    if (premium && !providers) loadProviders();
  }, [premium, providers, loadProviders]);

  if (!premium) {
    return (
      <div className="card stack-sm">
        <div style={{ fontWeight: 700 }}>Your cart, priced and split by store</div>
        <p className="small muted">Premium prices your list at your stores, picks where to buy each item, and fills each store’s cart.</p>
        <Link href="/premium" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>See Premium</Link>
      </div>
    );
  }

  const pricedStores = config.stores.filter((s) => GROCERY_STORE_INFO[s].prices && providers?.[s]);
  if (providers && pricedStores.length === 0) {
    return (
      <div className="alert alert-info">
        None of your stores are connected for prices yet. Check <Link href="/profile" style={{ fontWeight: 700 }}>Profile → Grocery stores</Link>.
      </div>
    );
  }

  const go = async (store: GroceryStoreId, items: { name: string; productId?: string }[]) => {
    setOpening(store);
    const url = await checkout(store, items.map((i) => ({ ...i, quantity: 1 })));
    setOpening(null);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const summary = cart ? summarizeCart(cart) : null;
  const line = cart?.lines.find((l) => l.key === open) ?? null;
  const instacartReady = config.stores.includes('instacart') && providers?.instacart;

  return (
    <section className="stack">
      {!cart ? (
        <div className="card stack-sm">
          <div style={{ fontWeight: 700 }}>Build your cart</div>
          <p className="small muted">
            Takes your list (minus what’s in your pantry or skipped), finds each item at {pricedStores.map(storeName).join(' and ') || 'your stores'}, and splits it the
            {config.strategy === 'cheapest' ? ' cheapest' : config.strategy === 'balanced' ? ' best-value' : ' fewest-stores'} way.
          </p>
          <button className="btn btn-primary" onClick={buildCart} disabled={busy === 'building' || !list}>
            {busy === 'building' ? <><Spinner /> Pricing your list…</> : 'Build cart'}
          </button>
        </div>
      ) : (
        <>
          <div className="card stack-sm">
            <div className="row-between"><span className="muted">Estimated total</span><strong style={{ fontSize: 22 }}>{usd(summary!.total)}</strong></div>
            <div className="small muted">
              {summary!.stores.map((s) => `${storeName(s.store)} ${s.lines.length}`).join(' · ')}
              {summary!.missing.length ? ` · ${summary!.missing.length} not found` : ''}
            </div>
            {summary!.dealSavings > 0 && <div className="small" style={{ color: 'var(--accent)' }}>Includes {usd(summary!.dealSavings)} in deals</div>}
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <button className="btn btn-secondary btn-sm grow" onClick={buildCart} disabled={busy === 'building'}>
                <Icon name="refresh" size={16} /> {busy === 'building' ? 'Updating…' : 'Update from list'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Clear the cart?') && clearCart()}>Clear</button>
            </div>
            <div className="tiny faint">Prices are estimates from each store and can change at checkout. Your own picks are kept when you update.</div>
          </div>

          {summary!.stores.map((group) => (
            <div key={group.store} className="stack-sm">
              <div className="section-title" style={{ margin: 0 }}>
                <span>{storeName(group.store)} · {group.lines.length}</span>
                <span style={{ textTransform: 'none', letterSpacing: 0 }}>{usd(group.subtotal)}</span>
              </div>
              <div className="list">{group.lines.map((l) => <CartRow key={l.key} line={l} onOpen={() => setOpen(l.key)} />)}</div>
              {group.store === 'walmart' && (
                <button className="btn btn-primary btn-block" disabled={opening !== null}
                  onClick={() => go('walmart', group.lines.map((l) => ({ name: l.choice!.name, productId: l.choice!.productId })))}>
                  {opening === 'walmart' ? 'Opening…' : `Check out at Walmart (${group.lines.length})`}
                </button>
              )}
              {group.store === 'kroger' && <p className="hint">Kroger checkout needs a Kroger sign-in (coming next). Open items from their detail for now.</p>}
            </div>
          ))}

          {summary!.missing.length > 0 && (
            <div className="stack-sm">
              <div className="section-title" style={{ margin: 0 }}><span>Not found · {summary!.missing.length}</span></div>
              <div className="list">{summary!.missing.map((l) => <CartRow key={l.key} line={l} onOpen={() => setOpen(l.key)} />)}</div>
              {instacartReady && (
                <button className="btn btn-secondary btn-block" disabled={opening !== null} onClick={() => go('instacart', summary!.missing.map((l) => ({ name: l.name })))}>
                  Send these to Instacart ({config.instacartRetailer})
                </button>
              )}
            </div>
          )}
          {instacartReady && (
            <button className="btn btn-secondary btn-block" disabled={opening !== null} onClick={() => go('instacart', cart.lines.map((l) => ({ name: l.name })))}>
              {opening === 'instacart' ? 'Opening…' : `Shop it all on Instacart (${config.instacartRetailer})`}
            </button>
          )}
        </>
      )}
      {error && <div className="alert" role="alert">{error}</div>}

      <details className="card">
        <summary style={{ fontWeight: 600, cursor: 'pointer' }}>Search all your stores</summary>
        <form className="row" style={{ gap: 8, marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); searchProducts(query); }}>
          <input className="input" type="search" placeholder="e.g. pepper jack cheese" aria-label="Search all stores" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn btn-secondary" disabled={!query.trim() || busy === 'searching'} aria-label="Search"><Icon name="search" size={18} /></button>
        </form>
        {busy === 'searching' && <div className="center" style={{ marginTop: 10 }}><Spinner /></div>}
        {searchResults && (
          <div className="list" style={{ marginTop: 10 }}>
            {searchResults.length === 0 ? <p className="hint" style={{ padding: 12 }}>No products found.</p> : searchResults.slice(0, 12).map((o) => <OfferRow key={`${o.store}:${o.productId}`} offer={o} />)}
          </div>
        )}
      </details>

      <CartLineSheet line={line} onClose={() => setOpen(null)} />
    </section>
  );
}

function CartRow({ line, onOpen }: { line: CartLine; onOpen: () => void }) {
  const o = line.choice;
  return (
    <button className="list-row" onClick={onOpen} style={{ width: '100%', textAlign: 'left', gap: 10 }}>
      <FoodTile title={o?.name ?? line.name} imageUrl={o?.imageUrl} size={40} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="truncate" style={{ display: 'block', fontWeight: 600 }}>{o?.name ?? line.name}</span>
        <span className="tiny faint truncate" style={{ display: 'block' }}>
          {[o ? `for ${line.name}` : 'No match yet, tap to search', line.amount, line.chosenBy === 'user' && 'your pick'].filter(Boolean).join(' · ')}
        </span>
      </span>
      {o && <Price offer={o} />}
      <Icon name="chevronRight" size={18} />
    </button>
  );
}

function Price({ offer }: { offer: ProductOffer }) {
  const deal = offer.promoPrice != null && offer.promoPrice < offer.price;
  return (
    <span style={{ textAlign: 'right', flexShrink: 0 }}>
      <strong style={{ display: 'block', color: deal ? 'var(--accent)' : undefined }}>{usd(offerPrice(offer))}</strong>
      {deal && <span className="tiny faint" style={{ textDecoration: 'line-through' }}>{usd(offer.price)}</span>}
    </span>
  );
}

function OfferRow({ offer, selected, recommended, onPick }: { offer: ProductOffer; selected?: boolean; recommended?: boolean; onPick?: () => void }) {
  const body = (
    <>
      <FoodTile title={offer.name} imageUrl={offer.imageUrl} size={40} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="truncate" style={{ display: 'block', fontWeight: 600 }}>{offer.name}</span>
        <span className="tiny faint truncate" style={{ display: 'block' }}>
          {[storeName(offer.store), offer.size, offer.organic && 'Organic', !offer.inStock && 'Out of stock'].filter(Boolean).join(' · ')}
        </span>
      </span>
      {recommended && <span className="badge badge-premium" style={{ flexShrink: 0 }}>Best pick</span>}
      {selected && <span style={{ color: 'var(--primary)' }}><Icon name="check" size={18} /></span>}
      <Price offer={offer} />
    </>
  );
  return onPick ? (
    <button className="list-row" onClick={onPick} disabled={!offer.inStock} aria-pressed={selected} style={{ width: '100%', textAlign: 'left', gap: 10, background: selected ? 'var(--primary-soft)' : undefined }}>{body}</button>
  ) : (
    <div className="list-row" style={{ gap: 10 }}>{body}</div>
  );
}

/** One cart item: pick another product or store, search, swap the ingredient, or remove it. */
function CartLineSheet({ line, onClose }: { line: CartLine | null; onClose: () => void }) {
  const chooseOffer = useGroceryStore((s) => s.chooseOffer);
  const searchLine = useGroceryStore((s) => s.searchLine);
  const swapCartLine = useGroceryStore((s) => s.swapCartLine);
  const removeLine = useGroceryStore((s) => s.removeLine);
  const recommend = useGroceryStore((s) => s.recommend);
  const lineBusy = useGroceryStore((s) => s.lineBusy);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'options' | 'swap'>('options');
  const [best, setBest] = useState<ProductOffer | null>(null);

  useEffect(() => {
    if (!line) return;
    setQuery(line.name);
    setMode('options');
    recommend(line.key, line.options).then(setBest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line?.key, line?.options.length]);

  if (!line) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const busy = lineBusy.includes(line.key);
  const isBest = (o: ProductOffer) => !!best && best.store === o.store && best.productId === o.productId;
  const isChosen = (o: ProductOffer) => !!line.choice && line.choice.store === o.store && line.choice.productId === o.productId;
  const options = [...line.options].sort((a, b) => Number(isBest(b)) - Number(isBest(a)) || offerPrice(a) - offerPrice(b));

  return (
    <Sheet open onClose={onClose} title={line.name.replace(/^\w/, (c) => c.toUpperCase())}>
      <div className="stack">
        <p className="small muted">{[line.amount, line.recipes.length ? `for ${line.recipes.join(', ')}` : null].filter(Boolean).join(' · ') || 'Added by you'}</p>
        <Segmented options={[{ value: 'options', label: 'Products' }, { value: 'swap', label: 'Swap ingredient' }]} value={mode} onChange={setMode} />

        {mode === 'options' ? (
          <>
            {options.length > 0 ? (
              <div className="list">
                {options.map((o) => (
                  <OfferRow key={`${o.store}:${o.productId}`} offer={o} selected={isChosen(o)} recommended={isBest(o)}
                    onPick={async () => { await chooseOffer(line.key, o); onClose(); }} />
                ))}
              </div>
            ) : (
              <p className="hint">No products found yet. Try a different search.</p>
            )}
            <p className="tiny faint">“Best pick” weighs price against adding another store, using your settings.</p>
            <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); searchLine(line.key, query); }}>
              <input className="input" type="search" aria-label="Search for a product" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="btn btn-secondary" disabled={!query.trim() || busy}>{busy ? <Spinner /> : <Icon name="search" size={18} />}</button>
            </form>
            {line.choice?.url && (
              <a className="small" href={line.choice.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-2)' }}>
                View this product at {storeName(line.choice.store)} ↗
              </a>
            )}
          </>
        ) : (
          <SwapOptions
            ingredient={line.name}
            busy={busy}
            label={line.recipes.length ? `Use instead (updates ${line.recipes.join(', ')})` : 'Use instead'}
            onSwap={async (name) => {
              onClose();
              await swapCartLine(line.key, name);
            }}
          />
        )}
        <button className="btn btn-ghost btn-block" style={{ color: 'var(--danger)' }} onClick={async () => { await removeLine(line.key); onClose(); }}>
          Remove from cart
        </button>
      </div>
    </Sheet>
  );
}
