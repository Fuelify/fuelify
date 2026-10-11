// Meal plan repository — Supabase/PostgreSQL
// Replaces the old API client meal endpoints that previously went through DynamoDB

import type { TypedSupabaseClient } from './client';
import type { MealRow } from './types';
import { readMealOptions, type MealOption } from '../models/meal';

export interface MealPlanMeal {
  id: string;
  title: string;
  description: string;
  mealType: string;
  sortOrder: number;
  date: string;
  recipeId: string | null;
  /** Created by the meal plan generator (replaced on regenerate) */
  generated: boolean;
  /** Ranked recipes this meal can be swapped to (generated meals only) */
  alternatives: MealOption[];
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
    generated: row.generated ?? false,
    alternatives: readMealOptions(row.alternatives),
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

  /** Remove generator-made meals on the given dates; meals the user added stay. */
  async deleteGeneratedMeals(userId: string, dates: string[]): Promise<void> {
    if (dates.length === 0) return;
    const { error } = await this.supabase
      .from('meals')
      .delete()
      .eq('user_id', userId)
      .eq('generated', true)
      .in('date', dates);

    if (error) throw new Error(`Failed to clear generated meals: ${error.message}`);
  }

  /** Insert generator-made meals in bulk (one round trip for plans, one for meals). */
  async addGeneratedMeals(userId: string, meals: {
    title: string;
    description: string;
    date: string;
    mealType: string;
    recipeId: string;
    sortOrder: number;
    alternatives: MealOption[];
  }[]): Promise<void> {
    if (meals.length === 0) return;
    const dates = [...new Set(meals.map((m) => m.date))];
    const { data: plans, error: planError } = await this.supabase
      .from('meal_plans')
      .upsert(dates.map((date) => ({ user_id: userId, date })), { onConflict: 'user_id,date' })
      .select('id, date');

    if (planError) throw new Error(`Failed to upsert meal plans: ${planError.message}`);
    const planIds = new Map((plans ?? []).map((p) => [p.date, p.id]));

    const { error } = await this.supabase.from('meals').insert(
      meals.map((m) => ({
        user_id: userId,
        meal_plan_id: planIds.get(m.date),
        title: m.title,
        description: m.description,
        date: m.date,
        meal_type: m.mealType,
        recipe_id: m.recipeId,
        sort_order: m.sortOrder,
        generated: true,
        alternatives: m.alternatives,
      })),
    );

    if (error) throw new Error(`Failed to add generated meals: ${error.message}`);
  }

  /** Swap a generated meal to another recipe; it stays generated. */
  async swapMeal(mealId: string, option: MealOption, alternatives: MealOption[]): Promise<void> {
    const { error } = await this.supabase
      .from('meals')
      .update({
        recipe_id: option.recipeId,
        title: option.title,
        description: option.description,
        alternatives,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mealId);

    if (error) throw new Error(`Failed to swap meal: ${error.message}`);
  }

  /** Update an existing meal. Edited meals count as the user's own, so regenerating keeps them. */
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
        generated: false,
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
        generated: false,
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
