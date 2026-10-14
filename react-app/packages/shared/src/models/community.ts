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
  /** Showcased by an admin: shown to everyone (gallery and Discover cards). Otherwise only the uploader (and admins) see it. */
  featured: boolean;
  createdAt: string;
}

/** Who sees a member photo, from the viewer's point of view. */
export function photoAudience(p: RecipePhoto, viewerId: string | null): 'stock' | 'yours' | 'showcased' | 'pending' {
  if (p.source === 'stock') return 'stock';
  if (p.uploadedBy && p.uploadedBy === viewerId) return 'yours';
  return p.featured ? 'showcased' : 'pending';
}

/**
 * Photos for a recipe's gallery, in order: the recipe's own photo, yours
 * (always shown to you), showcased ones, then (admins only) ones waiting to be
 * showcased. Newest first within each group, no duplicates. Other people's
 * photos that aren't showcased only reach admins (the database filters them).
 */
export function recipeGallery(recipe: { id: string; imageUrl?: string | null }, photos: RecipePhoto[], viewerId: string | null = null): RecipePhoto[] {
  const stock: RecipePhoto[] = recipe.imageUrl
    ? [{ id: `stock-${recipe.id}`, recipeId: recipe.id, url: recipe.imageUrl, source: 'stock', uploadedBy: null, featured: true, createdAt: '' }]
    : [];
  const rank = { stock: 0, yours: 1, showcased: 2, pending: 3 } as const;
  const seen = new Set(stock.map((p) => p.url));
  const rest = [...photos]
    .sort((a, b) => rank[photoAudience(a, viewerId)] - rank[photoAudience(b, viewerId)] || b.createdAt.localeCompare(a.createdAt))
    .filter((p) => !seen.has(p.url) && seen.add(p.url));
  return [...stock, ...rest];
}

/** The photo for a Discover card: the recipe's own, else its newest showcased member photo. */
export function cardPhoto(recipe: { imageUrl?: string | null }, showcased: RecipePhoto[] | undefined): string | null {
  return recipe.imageUrl ?? [...(showcased ?? [])].filter((p) => p.featured).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.url ?? null;
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
