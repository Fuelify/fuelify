// Community data for recipes: anonymous stats (an RPC that returns counts
// only) and member photos (recipe_images + the recipe-photos bucket).

import type { TypedSupabaseClient } from './client';
import type { RecipeCommunityStats, RecipePhoto } from '../models/community';
import type { Database } from './types';

type ImageRow = Database['public']['Tables']['recipe_images']['Row'];
const toPhoto = (r: ImageRow): RecipePhoto => ({
  id: r.id,
  recipeId: r.recipe_id,
  url: r.url,
  source: r.source as RecipePhoto['source'],
  uploadedBy: r.uploaded_by,
  featured: !!r.featured,
  createdAt: r.created_at,
});

export const RECIPE_PHOTO_BUCKET = 'recipe-photos';

export class CommunityRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  async stats(recipeIds: string[]): Promise<RecipeCommunityStats[]> {
    if (recipeIds.length === 0) return [];
    const { data, error } = await this.supabase.rpc('recipe_community_stats', { ids: recipeIds });
    if (error) throw new Error(`Failed to load community stats: ${error.message}`);
    return (data ?? []).map((r) => ({ recipeId: r.recipe_id, likes: r.likes, favorites: r.favorites, cooked30d: r.cooked_30d, trending: r.trending }));
  }

  async photos(recipeId: string): Promise<RecipePhoto[]> {
    const { data, error } = await this.supabase.from('recipe_images').select('*').eq('recipe_id', recipeId).order('created_at', { ascending: false }).limit(30);
    if (error) throw new Error(`Failed to load photos: ${error.message}`);
    return (data ?? []).map(toPhoto);
  }

  /** Showcased photos for several recipes (for Discover cards). */
  async showcased(recipeIds: string[]): Promise<RecipePhoto[]> {
    if (recipeIds.length === 0) return [];
    const { data, error } = await this.supabase.from('recipe_images').select('*').in('recipe_id', recipeIds).eq('featured', true);
    if (error) throw new Error(`Failed to load photos: ${error.message}`);
    return (data ?? []).map(toPhoto);
  }

  /** Is the signed-in user an app admin? */
  async isAdmin(userId: string): Promise<boolean> {
    const { data } = await this.supabase.from('app_admins').select('user_id').eq('user_id', userId).maybeSingle();
    return !!data;
  }

  /** Admins: member photos waiting to be showcased, newest first, with recipe titles. */
  async pending(limit = 60): Promise<(RecipePhoto & { recipeTitle: string })[]> {
    const { data, error } = await this.supabase.from('recipe_images').select('*').eq('source', 'user').eq('featured', false).order('created_at', { ascending: false }).limit(limit);
    if (error) throw new Error(`Failed to load photos: ${error.message}`);
    const ids = [...new Set((data ?? []).map((r) => r.recipe_id))];
    const { data: recipes } = ids.length ? await this.supabase.from('recipes').select('id, title').in('id', ids) : { data: [] as { id: string; title: string }[] };
    const titles = new Map((recipes ?? []).map((r) => [r.id, r.title]));
    return (data ?? []).map((r) => ({ ...toPhoto(r), recipeTitle: titles.get(r.recipe_id) ?? 'Recipe' }));
  }

  /** Admins: showcase a photo to everyone, or take it back to private. */
  async setFeatured(photoId: string, featured: boolean): Promise<RecipePhoto> {
    const { data, error } = await this.supabase.rpc('set_recipe_image_featured', { image_id: photoId, on_off: featured });
    if (error) throw new Error(error.message.includes('not_admin') ? 'Only admins can showcase photos.' : `Failed to update photo: ${error.message}`);
    return toPhoto(data as ImageRow);
  }

  /** Upload a photo (already resized JPEG) for a recipe. */
  async addPhoto(userId: string, recipeId: string, image: Blob): Promise<RecipePhoto> {
    const storage = this.supabase.storage.from(RECIPE_PHOTO_BUCKET);
    const path = `${userId}/${recipeId}/${Date.now()}.jpg`;
    const { error: upErr } = await storage.upload(path, image, { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (upErr) throw new Error(`Failed to upload photo: ${upErr.message}`);
    const url = storage.getPublicUrl(path).data.publicUrl;
    const { data, error } = await this.supabase.from('recipe_images').insert({ recipe_id: recipeId, url, source: 'user', uploaded_by: userId }).select('*').single();
    if (error) {
      await storage.remove([path]).catch(() => {});
      throw new Error(`Failed to save photo: ${error.message}`);
    }
    return toPhoto(data);
  }

  async removePhoto(photo: RecipePhoto): Promise<void> {
    const { error } = await this.supabase.from('recipe_images').delete().eq('id', photo.id);
    if (error) throw new Error(`Failed to remove photo: ${error.message}`);
    const marker = `/${RECIPE_PHOTO_BUCKET}/`;
    const at = photo.url.indexOf(marker);
    if (at >= 0) await this.supabase.storage.from(RECIPE_PHOTO_BUCKET).remove([photo.url.slice(at + marker.length)]).catch(() => {});
  }
}
