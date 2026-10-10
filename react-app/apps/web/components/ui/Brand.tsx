import {
  BRAND_COLORS,
  LOGO_LEAVES,
  LOGO_STROKES,
  LOGO_STROKE_WIDTH,
  LOGO_VIEWBOX,
  foodEmoji,
  foodGradientColors,
  initialsOf,
} from '@fuelify/shared';

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

/** The Fuelify mark, rendered from the shared geometry so it stays crisp at any size. */
export function LogoMark({ size = 40, title = 'Fuelify' }: { size?: number; title?: string }) {
  const { x, y, width, height } = LOGO_VIEWBOX;
  return (
    <svg
      viewBox={`${x} ${y} ${width} ${height}`}
      width={size}
      height={size}
      role="img"
      aria-label={title}
      fill="none"
      strokeLinecap="round"
      strokeWidth={LOGO_STROKE_WIDTH}
      style={{ flexShrink: 0 }}
    >
      {LOGO_LEAVES.map((leaf, i) => (
        <path key={`leaf-${i}`} d={leaf.path} fill={BRAND_COLORS[leaf.color]} />
      ))}
      {LOGO_STROKES.map(([x1, y1, x2, y2, color], i) => (
        <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke={BRAND_COLORS[color]} />
      ))}
    </svg>
  );
}

/**
 * Mark + wordmark. `stacked` puts the name under the mark (splash, login);
 * otherwise they sit side by side (headers).
 */
export function Logo({ size = 44, stacked = false, showName = true }: { size?: number; stacked?: boolean; showName?: boolean }) {
  const markSize = stacked ? size * 2 : size;
  return (
    <div
      style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', alignItems: 'center', gap: stacked ? 12 : size * 0.22 }}
      aria-label="Fuelify"
      role="img"
    >
      <LogoMark size={markSize} title="" />
      {showName && (
        <span className="brand-text" style={{ fontSize: stacked ? size : size * 0.62, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Fuelify
        </span>
      )}
    </div>
  );
}
