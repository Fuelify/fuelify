// What the Fuelify community does with a recipe: anonymous counts across all
// users (see recipe_community_stats in migration 00022) and photos members add.

export interface RecipeCommunityStats {
  recipeId: string;
  likes: number;
  favorites: number;
  /** Times it was on someone's plan for a day in the last 30 days */
  cooked30d: number;
  /** Among the most liked/favorited/cooked this week */
  trending: boolean;
}

export interface RecipePhoto {
  id: string;
  recipeId: string;
  url: string;
  /** 'stock' = the recipe's own photo; 'user' = added by a member */
  source: 'stock' | 'user';
  uploadedBy: string | null;
  createdAt: string;
}

/** The recipe's own photo first, then members' photos (newest first), no duplicates. */
export function recipeGallery(recipe: { id: string; imageUrl?: string | null }, photos: RecipePhoto[]): RecipePhoto[] {
  const stock: RecipePhoto[] = recipe.imageUrl
    ? [{ id: `stock-${recipe.id}`, recipeId: recipe.id, url: recipe.imageUrl, source: 'stock', uploadedBy: null, createdAt: '' }]
    : [];
  const seen = new Set(stock.map((p) => p.url));
  const rest = [...photos]
    .sort((a, b) => (a.source === b.source ? b.createdAt.localeCompare(a.createdAt) : a.source === 'stock' ? -1 : 1))
    .filter((p) => !seen.has(p.url) && seen.add(p.url));
  return [...stock, ...rest];
}

/** Short labels for the stats that have something to say, e.g. ["12 likes", "3 favorites", "Cooked 8× this month"]. */
export function communityHighlights(s: RecipeCommunityStats | null | undefined): string[] {
  if (!s) return [];
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  return [
    s.likes > 0 ? plural(s.likes, 'like') : null,
    s.favorites > 0 ? plural(s.favorites, 'favorite') : null,
    s.cooked30d > 0 ? `Cooked ${s.cooked30d}× this month` : null,
  ].filter((x): x is string => !!x);
}
