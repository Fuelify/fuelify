import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_COLORS, LOGO_LEAVES, LOGO_STROKES, LOGO_STROKE_WIDTH, LOGO_VIEWBOX } from './brand';

// The shared geometry must stay in sync with the source SVG in assets/brand.
const svg = readFileSync(resolve(__dirname, '../../../../../assets/brand/fuelify-mark.svg'), 'utf8');

describe('brand logo geometry', () => {
  it('matches the viewBox and stroke width of the source SVG', () => {
    const { x, y, width, height } = LOGO_VIEWBOX;
    expect(svg).toContain(`viewBox="${x} ${y} ${width} ${height}"`);
    expect(svg).toContain(`stroke-width="${LOGO_STROKE_WIDTH}"`);
  });

  it('contains every leaf and stroke with the right colour', () => {
    for (const leaf of LOGO_LEAVES) {
      expect(svg).toContain(`<path d="${leaf.path}" fill="${BRAND_COLORS[leaf.color]}"`);
    }
    for (const [x1, y1, x2, y2, color] of LOGO_STROKES) {
      expect(svg).toContain(`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${BRAND_COLORS[color]}"/>`);
    }
    const paths = svg.match(/<path /g) ?? [];
    expect(paths).toHaveLength(LOGO_LEAVES.length + LOGO_STROKES.length);
  });
});
