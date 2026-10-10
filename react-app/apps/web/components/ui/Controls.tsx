'use client';

import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** Checkbox / radio style option row used in onboarding and forms. */
export function OptionRow({
  selected,
  onClick,
  radio,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  radio?: boolean;
  title: ReactNode;
  body?: ReactNode;
}) {
  return (
    <button type="button" className={`option${radio ? ' radio' : ''}`} aria-pressed={selected} onClick={onClick}>
      <span className="check">{selected && <Icon name="check" />}</span>
      <span className="grow">
        <span style={{ display: 'block', fontWeight: 600 }}>{title}</span>
        {body && <span className="small muted" style={{ display: 'block', marginTop: 2 }}>{body}</span>}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
