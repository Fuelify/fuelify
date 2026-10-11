// Per-serving nutrition beyond calories (recipes.nutrition JSONB).

export interface Nutrition {
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
}

/** Display order and labels. */
export const NUTRIENTS: { key: keyof Nutrition; label: string; unit: 'g' | 'mg' }[] = [
  { key: 'proteinG', label: 'Protein', unit: 'g' },
  { key: 'carbsG', label: 'Carbs', unit: 'g' },
  { key: 'fatG', label: 'Fat', unit: 'g' },
  { key: 'fiberG', label: 'Fiber', unit: 'g' },
  { key: 'sugarG', label: 'Sugar', unit: 'g' },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
];

/** Lenient read of recipes.nutrition; keeps only finite, non-negative numbers. */
export function readNutrition(raw: unknown): Nutrition {
  if (!raw || typeof raw !== 'object') return {};
  const out: Nutrition = {};
  for (const { key } of NUTRIENTS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[key] = v;
  }
  return out;
}
