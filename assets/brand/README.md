# Fuelify brand

- `fuelify-mark.svg` — **primary** logo mark (design #2, double leaf), rebuilt as a vector from the Canva original.
- `fuelify-mark-v1.svg` — design #1 (single leaf), kept for reference.
- Brand colours (also exported from `@fuelify/shared` as `BRAND_COLORS`):

| Name | Hex | Use |
|---|---|---|
| Cyan | `#6DE6FB` | leaf, accents |
| Orchid | `#EBA3F9` | highlights, favorites |
| Periwinkle | `#759EF8` | primary |

The app themes derive from these: the dark theme uses them directly on a deep
indigo background; the light theme uses deeper shades of each so text and
buttons meet WCAG AA contrast. Web icons in `react-app/apps/web/public/` are
generated from the SVG.
