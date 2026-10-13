'use client';

import type { ReactNode } from 'react';
import {
  DEFAULT_WEEKLY_BUDGET,
  MAX_WEEKLY_BUDGET,
  PRICE_IMPACT_OPTIONS,
  SHOPPING_TENDENCY_OPTIONS,
  type ShoppingPreferences,
} from '@fuelify/shared';
import { OptionRow } from '@/components/ui';

/** The household's shopping habits and weekly budget (household setup and the household page). */
export function ShoppingPreferencesForm({ value, onChange }: { value: ShoppingPreferences; onChange: (patch: ShoppingPreferences) => void }) {
  const budget = value.budget ?? DEFAULT_WEEKLY_BUDGET;
  return (
    <div className="stack-lg">
      <Question title="How does your household shop?">
        {SHOPPING_TENDENCY_OPTIONS.map((o) => (
          <OptionRow key={o} radio title={o} selected={value.tendency === o} onClick={() => onChange({ tendency: o })} />
        ))}
      </Question>
      <Question title="Do food prices shape what you plan for the week?" hint="Includes sales, discounts, bulk deals and seasonality.">
        {PRICE_IMPACT_OPTIONS.map((o) => (
          <OptionRow key={o} radio title={o} selected={value.priceSensitivity === o} onClick={() => onChange({ priceSensitivity: o })} />
        ))}
      </Question>
      <Question title="Weekly grocery budget for the household" hint="Approximate. You can change it any time.">
        <div className="card stack-sm">
          <div className="row-between">
            <span className="muted small">$0</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--primary)' }}>${budget}<span className="small muted">/week</span></span>
            <span className="muted small">${MAX_WEEKLY_BUDGET}</span>
          </div>
          <input type="range" min={0} max={MAX_WEEKLY_BUDGET} step={5} value={budget} aria-label="Weekly grocery budget"
            onChange={(e) => onChange({ budget: Number(e.target.value) })} />
        </div>
      </Question>
    </div>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="stack-sm">
      <div>
        <h3 className="h3">{title}</h3>
        {hint && <p className="hint" style={{ marginTop: 2 }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}
