'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GROCERY_STORES,
  GROCERY_STORE_INFO,
  GROCERY_STRATEGIES,
  GROCERY_STRATEGY_LABELS,
  readGroceryConfig,
  usZip,
  type GroceryConfig,
  type GroceryStoreId,
} from '@fuelify/shared';
import { useGroceryStore, useHouseholdStore, useProfileStore } from '@/lib/stores';
import { usePlan } from '@/features/premium/usePlan';
import { Icon, Segmented } from '@/components/ui';

/** Profile card: which stores to shop and how to optimize (profiles.grocery_config). */
export function GrocerySettings() {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const providers = useGroceryStore((s) => s.providers);
  const loadProviders = useGroceryStore((s) => s.loadProviders);
  const { premium } = usePlan();
  const household = useHouseholdStore((s) => s.households.find((h) => h.id === s.activeHouseholdId));
  const householdZip = usZip(household?.postcode);
  const config = readGroceryConfig(profile);
  const [zip, setZip] = useState(config.zipCode ?? '');
  const [retailer, setRetailer] = useState(config.instacartRetailer);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providers) loadProviders();
  }, [providers, loadProviders]);
  useEffect(() => {
    setZip(config.zipCode ?? '');
    setRetailer(config.instacartRetailer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const save = async (patch: Partial<GroceryConfig>) => {
    setError(null);
    if (!(await updateProfile({ groceryConfig: { ...config, ...patch } }))) setError('Couldn’t save. Try again.');
  };

  const toggleStore = (id: GroceryStoreId) =>
    save({ stores: config.stores.includes(id) ? config.stores.filter((s) => s !== id) : [...config.stores, id] });

  const saveZip = () => {
    const z = zip.trim();
    if (z === (config.zipCode ?? '')) return;
    if (z && !/^\d{5}$/.test(z)) {
      setError('Enter a 5-digit ZIP code.');
      return;
    }
    save({ zipCode: z || null });
  };

  return (
    <div className="card stack-sm">
      {!premium && (
        <p className="hint">
          Store connections are a <Link href="/premium" style={{ color: 'var(--primary)', fontWeight: 600 }}>Premium</Link> feature. You can set these up now.
        </p>
      )}

      {householdZip ? (
        // Location is the household's; it sets the ZIP for local prices
        <Link href="/household" className="list-row" style={{ gap: 10, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <Icon name="pin" size={18} />
          <span className="grow">
            <span style={{ display: 'block', fontWeight: 600 }}>{household?.location ?? householdZip}</span>
            <span className="tiny muted">Prices near {householdZip} · household location</span>
          </span>
          <span className="small" style={{ color: 'var(--primary)', fontWeight: 600 }}>Change</span>
        </Link>
      ) : (
        <div className="field">
          <label htmlFor="grocery-zip">ZIP code</label>
          <input id="grocery-zip" className="input" inputMode="numeric" maxLength={5} placeholder="e.g. 33602" value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))} onBlur={saveZip} />
          <span className="hint">
            Used for local prices. Or <Link href="/household" style={{ color: 'var(--primary)', fontWeight: 600 }}>set your household’s location</Link> for everyone.
          </span>
        </div>
      )}

      <span className="label">Stores</span>
      <div className="list">
        {GROCERY_STORES.map((id) => {
          const info = GROCERY_STORE_INFO[id];
          const on = config.stores.includes(id);
          const connected = providers?.[id];
          return (
            <button key={id} className="list-row" role="switch" aria-checked={on} onClick={() => toggleStore(id)} style={{ textAlign: 'left', gap: 12 }}>
              <span className="grow">
                <span className="row" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{info.name}</span>
                  {providers && <span className={`badge ${connected ? 'badge-accent' : ''}`}>{connected ? 'Connected' : 'Not set up yet'}</span>}
                </span>
                <span className="tiny muted" style={{ display: 'block', marginTop: 2 }}>{info.note}</span>
              </span>
              <span className={`switch${on ? ' on' : ''}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {config.stores.includes('instacart') && (
        <div className="field">
          <label htmlFor="grocery-retailer">Instacart store</label>
          <input id="grocery-retailer" className="input" value={retailer} onChange={(e) => setRetailer(e.target.value)}
            onBlur={() => retailer.trim() && retailer.trim() !== config.instacartRetailer && save({ instacartRetailer: retailer.trim() })} />
          <span className="hint">Where Instacart should shop, e.g. Publix. You confirm the store on Instacart.</span>
        </div>
      )}

      <span className="label">Optimize for</span>
      <Segmented options={GROCERY_STRATEGIES.map((s) => ({ value: s, label: GROCERY_STRATEGY_LABELS[s] }))} value={config.strategy} onChange={(strategy) => save({ strategy })} />
      <span className="hint">
        {config.strategy === 'cheapest' ? 'Splits your list wherever it’s cheapest.' : config.strategy === 'balanced' ? 'Adds a store only when it saves a few dollars.' : 'Sticks to one store unless it can’t get everything.'}
      </span>

      <span className="label">Most stores per shop</span>
      <Segmented options={[1, 2, 3].map((n) => ({ value: String(n), label: String(n) }))} value={String(config.maxStores)} onChange={(v) => save({ maxStores: Number(v) as 1 | 2 | 3 })} />

      <div className="chips" style={{ marginTop: 4 }}>
        <button className="chip" aria-pressed={config.preferOrganic} onClick={() => save({ preferOrganic: !config.preferOrganic })}>Prefer organic</button>
        <button className="chip" aria-pressed={config.preferStoreBrand} onClick={() => save({ preferStoreBrand: !config.preferStoreBrand })}>Prefer store brands</button>
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
    </div>
  );
}
