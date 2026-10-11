'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
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

/**
 * A dish's picture: the recipe photo when there is one, otherwise (or if it
 * fails to load) generated artwork from the title. Fills its container.
 */
export function FoodImage({
  title,
  imageUrl,
  emojiSize,
  className,
  style,
  children,
}: {
  title: string;
  imageUrl?: string | null;
  emojiSize?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Overlays (e.g. swipe hints) */
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = !!imageUrl && failed !== imageUrl;
  return (
    <div
      className={`food-image${className ? ` ${className}` : ''}`}
      style={{ background: showPhoto ? 'var(--surface-3)' : foodBackground(title), fontSize: emojiSize, ...style }}
      aria-hidden="true"
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote recipe photos, sized by CSS
        <img src={imageUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(imageUrl)} />
      ) : (
        foodEmoji(title)
      )}
      {children}
    </div>
  );
}

export function FoodTile({ title, imageUrl, size = 52 }: { title: string; imageUrl?: string | null; size?: number }) {
  return <FoodImage className="food-tile" title={title} imageUrl={imageUrl} emojiSize={size * 0.5} style={{ width: size, height: size }} />;
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
