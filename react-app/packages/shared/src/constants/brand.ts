// Fuelify brand palette, sampled from the logo (assets/brand/fuelify-mark.svg).
// Themes in each app derive from these; see assets/brand/README.md.

export const BRAND_COLORS = {
  cyan: '#6DE6FB',
  orchid: '#EBA3F9',
  periwinkle: '#759EF8',
} as const;

export type BrandColor = keyof typeof BRAND_COLORS;

/**
 * Logo geometry (viewBox units) so web (SVG) and native (react-native-svg)
 * render the same mark from one definition.
 */
export const LOGO_VIEWBOX = { x: 45, y: 17, width: 345, height: 345 } as const;
export const LOGO_STROKE_WIDTH = 37;
export const LOGO_LEAF_PATH = 'M163 22 C 205 24, 230 62, 218 104 C 180 98, 158 64, 163 22 Z';
/** Rounded strokes in paint order: [x1, y1, x2, y2, colour]. Zero-length strokes render as dots. */
export const LOGO_STROKES: readonly (readonly [number, number, number, number, BrandColor])[] = [
  [101, 155, 189, 242, 'cyan'],
  [141, 126, 187, 172, 'orchid'],
  [296, 126, 217, 205, 'orchid'],
  [334, 157, 283, 211, 'cyan'],
  [122, 244, 187, 310, 'periwinkle'],
  [233, 274, 213, 294, 'cyan'],
  [245, 235, 285, 275, 'orchid'],
  [322, 236, 312, 246, 'periwinkle'],
  [253, 309, 253, 309.01, 'cyan'],
  [220, 339, 220, 339.01, 'periwinkle'],
];
