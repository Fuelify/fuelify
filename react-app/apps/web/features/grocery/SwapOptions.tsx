'use client';

import { useState } from 'react';
import { suggestSwaps, type SuggestionMeta } from '@fuelify/shared';
import { useProfileStore } from '@/lib/stores';
import { Icon } from '@/components/ui';

/**
 * Swap ideas for one ingredient (filtered to the user's diet and allergens),
 * plus a box to type anything else. Used on a meal's recipe, the shopping
 * list and the cart.
 */
export function SwapOptions({
  ingredient,
  onSwap,
  busy,
  label = 'Swap for',
}: {
  /** The ingredient line or name to find swaps for */
  ingredient: string;
  /** `meta` records which suggestion was taken (or that they typed their own) */
  onSwap: (name: string, meta: SuggestionMeta) => void;
  busy?: boolean;
  label?: string;
}) {
  const profile = useProfileStore((s) => s.profile);
  const [custom, setCustom] = useState('');
  const ideas = suggestSwaps(ingredient, { diet: profile?.diet, allergens: profile?.allergens ?? [] });

  return (
    <div className="stack-sm">
      <span className="label">{label}</span>
      {ideas.length > 0 && (
        <div className="list">
          {ideas.map((s, i) => (
            <button key={s.name} className="list-row" onClick={() => onSwap(s.name, { suggestionRank: i, suggestionCount: ideas.length, suggestion: { note: s.note, diet: s.diet } })} disabled={busy} style={{ textAlign: 'left', gap: 10 }}>
              <span className="grow">
                <span style={{ fontWeight: 600, display: 'block' }}>{s.name}</span>
                <span className="tiny muted">{s.note}</span>
              </span>
              {s.diet === 'Vegan' && <span className="badge badge-accent">Plant-based</span>}
              <Icon name="chevronRight" size={18} />
            </button>
          ))}
        </div>
      )}
      <form
        className="row"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) onSwap(custom.trim(), { suggestionRank: null, suggestionCount: ideas.length });
        }}
      >
        <input className="input" placeholder={ideas.length ? 'Or type something else…' : 'What to use instead…'} aria-label="Use instead" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button className="btn btn-secondary" disabled={!custom.trim() || busy}>Use</button>
      </form>
    </div>
  );
}
