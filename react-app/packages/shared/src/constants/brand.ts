// Fuelify brand palette, sampled from the logo (assets/brand/fuelify-mark.svg, design #2).
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
/** Filled leaf shapes drawn first (primary mark: design #2, the double leaf). */
export const LOGO_LEAVES: readonly { path: string; color: BrandColor }[] = [
  { path: 'M163 33 C 205 35, 230 73, 218 115 C 180 109, 158 75, 163 33 Z', color: 'cyan' },
  { path: 'M232 108 C 228 81, 249 66, 275 65 C 277 91, 258 106, 232 108 Z', color: 'periwinkle' },
];
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
