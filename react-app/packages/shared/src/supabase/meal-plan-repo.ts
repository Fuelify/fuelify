// Meal plan repository — Supabase/PostgreSQL
// Replaces the old API client meal endpoints that previously went through DynamoDB

import type { TypedSupabaseClient } from './client';
import type { MealRow } from './types';

export interface MealPlanMeal {
  id: string;
  title: string;
  description: string;
  mealType: string;
  sortOrder: number;
  date: string;
  recipeId: string | null;
}

function rowToMeal(row: MealRow): MealPlanMeal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    mealType: row.meal_type,
    sortOrder: row.sort_order,
    date: row.date,
    recipeId: row.recipe_id,
  };
}

export class MealPlanRepository {
  constructor(private supabase: TypedSupabaseClient) {}

  /** Fetch meals for a date range (inclusive) */
  async getMealPlan(userId: string, startDate: string, endDate: string): Promise<Record<string, MealPlanMeal[]>> {
    const { data, error } = await this.supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('sort_order');

    if (error) throw new Error(`Failed to fetch meal plan: ${error.message}`);

    const grouped: Record<string, MealPlanMeal[]> = {};
    for (const row of data ?? []) {
      const date = row.date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(rowToMeal(row));
    }
    return grouped;
  }

  /** Fetch meals for a single date */
  async getDayMealPlan(userId: string, date: string): Promise<MealPlanMeal[]> {
    const { data, error } = await this.supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('sort_order');

    if (error) throw new Error(`Failed to fetch day meal plan: ${error.message}`);
    return (data ?? []).map(rowToMeal);
  }

  /** Add a meal to a plan date */
  async addMeal(userId: string, meal: {
    title: string;
    description?: string;
    date: string;
    mealType?: string;
    recipeId?: string;
  }): Promise<MealPlanMeal> {
    // Ensure a meal_plan row exists for this date (upsert)
    const { data: planData, error: planError } = await this.supabase
      .from('meal_plans')
      .upsert(
        { user_id: userId, date: meal.date },
        { onConflict: 'user_id,date' },
      )
      .select('id')
      .single();

    if (planError) throw new Error(`Failed to upsert meal plan: ${planError.message}`);

    const { data, error } = await this.supabase
      .from('meals')
      .insert({
        user_id: userId,
        meal_plan_id: planData.id,
        title: meal.title,
        description: meal.description ?? '',
        date: meal.date,
        meal_type: meal.mealType ?? 'dinner',
        recipe_id: meal.recipeId ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add meal: ${error.message}`);
    return rowToMeal(data);
  }

  /** Update an existing meal */
  async updateMeal(mealId: string, updates: {
    title?: string;
    description?: string;
    mealType?: string;
    sortOrder?: number;
  }): Promise<MealPlanMeal> {
    const { data, error } = await this.supabase
      .from('meals')
      .update({
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.mealType !== undefined && { meal_type: updates.mealType }),
        ...(updates.sortOrder !== undefined && { sort_order: updates.sortOrder }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', mealId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update meal: ${error.message}`);
    return rowToMeal(data);
  }

  /** Move a meal to a different date */
  async moveMeal(mealId: string, userId: string, newDate: string): Promise<MealPlanMeal> {
    // Ensure target date plan exists
    const { data: planData, error: planError } = await this.supabase
      .from('meal_plans')
      .upsert(
        { user_id: userId, date: newDate },
        { onConflict: 'user_id,date' },
      )
      .select('id')
      .single();

    if (planError) throw new Error(`Failed to upsert target meal plan: ${planError.message}`);

    const { data, error } = await this.supabase
      .from('meals')
      .update({
        date: newDate,
        meal_plan_id: planData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mealId)
      .select()
      .single();

    if (error) throw new Error(`Failed to move meal: ${error.message}`);
    return rowToMeal(data);
  }

  /** Delete a meal */
  async deleteMeal(mealId: string): Promise<void> {
    const { error } = await this.supabase
      .from('meals')
      .delete()
      .eq('id', mealId);

    if (error) throw new Error(`Failed to delete meal: ${error.message}`);
  }

  /** Add feedback to a meal */
  async addMealFeedback(userId: string, mealId: string, feedback: {
    rating?: number;
    comment?: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('meal_feedback')
      .upsert(
        {
          user_id: userId,
          meal_id: mealId,
          rating: feedback.rating ?? null,
          comment: feedback.comment ?? null,
        },
        { onConflict: 'user_id,meal_id' },
      );

    if (error) throw new Error(`Failed to add meal feedback: ${error.message}`);
  }

  /** Delete feedback from a meal */
  async deleteMealFeedback(userId: string, mealId: string): Promise<void> {
    const { error } = await this.supabase
      .from('meal_feedback')
      .delete()
      .eq('user_id', userId)
      .eq('meal_id', mealId);

    if (error) throw new Error(`Failed to delete meal feedback: ${error.message}`);
  }
}
