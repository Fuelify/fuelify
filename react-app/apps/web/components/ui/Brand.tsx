import { foodEmoji, foodGradientColors, initialsOf } from '@fuelify/shared';

/** CSS background for a dish's generated artwork. */
export function foodBackground(title: string): string {
  const [a, b] = foodGradientColors(title);
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function FoodTile({ title, size = 52 }: { title: string; size?: number }) {
  return (
    <div className="food-tile" style={{ width: size, height: size, fontSize: size * 0.5, background: foodBackground(title) }} aria-hidden="true">
      {foodEmoji(title)}
    </div>
  );
}

export function Avatar({ first, last, size }: { first?: string | null; last?: string | null; size?: 'md' | 'lg' }) {
  return <div className={`avatar${size === 'lg' ? ' avatar-lg' : ''}`}>{initialsOf(first, last) || '🙂'}</div>;
}

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <h1 style={{ color: 'var(--primary)', fontSize: size, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
      Fuelify
    </h1>
  );
}
