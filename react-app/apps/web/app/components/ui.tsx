'use client';

import { useEffect, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export { Icon };
export type { IconName };

/** Bottom sheet on phones, centered dialog on wider screens. */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      {children && <p className="small">{children}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function LoadingBlock() {
  return (
    <div className="center-fill">
      <Spinner />
    </div>
  );
}

export function PageHeader({ title, sub, left, right }: { title: string; sub?: ReactNode; left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="page-header">
      {left}
      <div className="grow">
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </header>
  );
}

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

// ----- Food visuals: deterministic emoji + gradient (no stock images needed) -----

const FOOD_EMOJI: [RegExp, string][] = [
  [/salmon|tuna|fish|poke/i, '🐟'],
  [/shrimp|scampi|prawn/i, '🍤'],
  [/chicken|turkey/i, '🍗'],
  [/beef|steak|burger/i, '🥩'],
  [/taco|burrito|wrap/i, '🌮'],
  [/curry|dal|masala/i, '🍛'],
  [/pad thai|noodle|ramen|zoodle/i, '🍜'],
  [/pasta|bolognese|spaghetti/i, '🍝'],
  [/salad|quinoa|bowl/i, '🥗'],
  [/oat|porridge|cereal/i, '🥣'],
  [/egg|scramble|omelet/i, '🍳'],
  [/pizza/i, '🍕'],
  [/soup|stew/i, '🍲'],
  [/mushroom|portobello/i, '🍄'],
  [/rice/i, '🍚'],
  [/sandwich|toast|bread/i, '🥪'],
  [/fruit|berry|apple|banana/i, '🍓'],
];

const GRADIENTS = [
  ['#ff9a5a', '#ff6b6b'],
  ['#4db6ac', '#2e7d74'],
  ['#ffbd73', '#e8873a'],
  ['#7c83fd', '#4b52c7'],
  ['#9bd16b', '#4f9a3a'],
  ['#f78fb3', '#c44569'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function foodEmoji(title: string) {
  return FOOD_EMOJI.find(([re]) => re.test(title))?.[1] ?? '🍽️';
}

export function foodGradient(title: string) {
  const [a, b] = GRADIENTS[hash(title) % GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function FoodTile({ title, size = 52 }: { title: string; size?: number }) {
  return (
    <div className="food-tile" style={{ width: size, height: size, fontSize: size * 0.5, background: foodGradient(title) }} aria-hidden="true">
      {foodEmoji(title)}
    </div>
  );
}

export function initials(first?: string | null, last?: string | null) {
  const s = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  return s || '🙂';
}

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <h1 style={{ color: 'var(--primary)', fontSize: size, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
      Fuelify
    </h1>
  );
}
