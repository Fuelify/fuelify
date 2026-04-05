// Ported from: lib/models/meal.dart

export interface Meal {
  id: string;
  title: string;
  description: string;
  // Future fields (commented out in Flutter):
  // imageUrl?: string;
  // ingredients?: string[];
  // steps?: string[];
  // date?: string;
}

export function parseMeal(data: Record<string, unknown>): Meal {
  return {
    id: data.id as string,
    title: data.title as string,
    description: data.description as string,
  };
}

export function mealToJSON(meal: Meal): Record<string, unknown> {
  return {
    id: meal.id,
    title: meal.title,
    description: meal.description,
  };
}
