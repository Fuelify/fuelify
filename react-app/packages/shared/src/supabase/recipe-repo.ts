// Recipe repository — Supabase/PostgreSQL
// Replaces the old API client recipe endpoints that previously went through DynamoDB

import type { TypedSupabaseClient } from './client';
import type { RecipeRow, RecipeClassificationRow, RecipeReviewRow } from './types';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  ingredients: string[];
  steps: string[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  cuisine: string | null;
  dietType: string | null;
  calories: number | null;
  createdBy: string | null;
}

export interface RecipeClassification {
  id: string;
  recipeId: string;
  classification: 'liked' | 'disliked' | 'favorited';
}

export interface RecipeReview {
  id: string;
  recipeId: string;
  userId: string;
  rating: number;
  reviewText: string | null;
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    ingredients: row.ingredients,
    steps: row.steps,
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    servings: row.servings,
    cuisine: row.cuisine,
    dietType: row.diet_type,
    calories: row.calories,
    createdBy: row.created_by,
  };
}

function rowToClassification(row: RecipeClassificationRow): RecipeClassification {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    classification: row.classification as RecipeClassification['classification'],
  };
}

function rowToReview(row: RecipeReviewRow): RecipeReview {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    userId: row.user_id,
    rating: row.rating,
    reviewText: row.review_text,
  };
}

export class RecipeRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  /** Get a single recipe by ID */
  async getRecipe(recipeId: string): Promise<Recipe> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (error) throw new Error(`Failed to fetch recipe: ${error.message}`);
    return rowToRecipe(data);
  }

  /** Search recipes with optional filters */
  async searchRecipes(filters: {
    query?: string;
    cuisine?: string;
    dietType?: string;
    maxCalories?: number;
    limit?: number;
    offset?: number;
  }): Promise<Recipe[]> {
    let query = this.supabase
      .from('recipes')
      .select('*');

    if (filters.query) {
      query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    }
    if (filters.cuisine) {
      query = query.eq('cuisine', filters.cuisine);
    }
    if (filters.dietType) {
      query = query.eq('diet_type', filters.dietType);
    }
    if (filters.maxCalories) {
      query = query.lte('calories', filters.maxCalories);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(
        filters.offset ?? 0,
        (filters.offset ?? 0) + (filters.limit ?? 20) - 1,
      );

    const { data, error } = await query;
    if (error) throw new Error(`Failed to search recipes: ${error.message}`);
    return (data ?? []).map(rowToRecipe);
  }

  /** Add a new recipe */
  async addRecipe(recipe: {
    title: string;
    description?: string;
    imageUrl?: string;
    ingredients?: string[];
    steps?: string[];
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    servings?: number;
    cuisine?: string;
    dietType?: string;
    calories?: number;
    createdBy?: string;
  }): Promise<Recipe> {
    const { data, error } = await this.supabase
      .from('recipes')
      .insert({
        title: recipe.title,
        description: recipe.description ?? '',
        image_url: recipe.imageUrl ?? null,
        ingredients: recipe.ingredients ?? [],
        steps: recipe.steps ?? [],
        prep_time_minutes: recipe.prepTimeMinutes ?? null,
        cook_time_minutes: recipe.cookTimeMinutes ?? null,
        servings: recipe.servings ?? null,
        cuisine: recipe.cuisine ?? null,
        diet_type: recipe.dietType ?? null,
        calories: recipe.calories ?? null,
        created_by: recipe.createdBy ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add recipe: ${error.message}`);
    return rowToRecipe(data);
  }

  /** Delete a recipe (from personal collection) */
  async deleteRecipe(recipeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId);

    if (error) throw new Error(`Failed to delete recipe: ${error.message}`);
  }

  /** Get similar recipes (by cuisine + diet type match) */
  async getSimilarRecipes(recipeId: string, limit: number = 5): Promise<Recipe[]> {
    // First get the reference recipe
    const reference = await this.getRecipe(recipeId);

    let query = this.supabase
      .from('recipes')
      .select('*')
      .neq('id', recipeId);

    // Match on cuisine or diet type
    const orConditions: string[] = [];
    if (reference.cuisine) orConditions.push(`cuisine.eq.${reference.cuisine}`);
    if (reference.dietType) orConditions.push(`diet_type.eq.${reference.dietType}`);
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    const { data, error } = await query.limit(limit);
    if (error) throw new Error(`Failed to fetch similar recipes: ${error.message}`);
    return (data ?? []).map(rowToRecipe);
  }

  // === Classification (like/dislike/favorite) ===

  /** Classify a recipe (like, dislike, or favorite) */
  async classifyRecipe(userId: string, recipeId: string, classification: 'liked' | 'disliked' | 'favorited'): Promise<void> {
    const { error } = await this.supabase
      .from('recipe_classifications')
      .upsert(
        { user_id: userId, recipe_id: recipeId, classification },
        { onConflict: 'user_id,recipe_id' },
      );

    if (error) throw new Error(`Failed to classify recipe: ${error.message}`);
  }

  /** Update an existing classification */
  async updateClassification(userId: string, recipeId: string, classification: 'liked' | 'disliked' | 'favorited'): Promise<void> {
    const { error } = await this.supabase
      .from('recipe_classifications')
      .update({ classification, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('recipe_id', recipeId);

    if (error) throw new Error(`Failed to update classification: ${error.message}`);
  }

  /** Get user's classified recipes, optionally filtered by type */
  async getClassifiedRecipes(userId: string, classificationType?: 'liked' | 'disliked' | 'favorited'): Promise<RecipeClassification[]> {
    let query = this.supabase
      .from('recipe_classifications')
      .select('*')
      .eq('user_id', userId);

    if (classificationType) {
      query = query.eq('classification', classificationType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to get classified recipes: ${error.message}`);
    return (data ?? []).map(rowToClassification);
  }

  // === Reviews ===

  /** Add a review on a recipe */
  async addReview(userId: string, recipeId: string, review: {
    rating: number;
    reviewText?: string;
  }): Promise<RecipeReview> {
    const { data, error } = await this.supabase
      .from('recipe_reviews')
      .upsert(
        {
          user_id: userId,
          recipe_id: recipeId,
          rating: review.rating,
          review_text: review.reviewText ?? null,
        },
        { onConflict: 'user_id,recipe_id' },
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to add review: ${error.message}`);
    return rowToReview(data);
  }

  /** Get reviews for a recipe */
  async getReviews(recipeId: string): Promise<RecipeReview[]> {
    const { data, error } = await this.supabase
      .from('recipe_reviews')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get reviews: ${error.message}`);
    return (data ?? []).map(rowToReview);
  }
}
