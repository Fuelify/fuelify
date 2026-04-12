// Supabase Database types for the Fuelify PostgreSQL schema
// Maps to the tables created in supabase/migrations/00001_initial_schema.sql

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; // UUID — matches auth.users.id
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          image_url: string | null;
          location: string | null;
          height: number | null;
          weight: number | null;
          birthdate: string | null;
          gender: string | null;
          gender_desc: string | null;
          diet: string | null;
          activeness: string | null;
          goals: Record<string, unknown>;
          shopping: Record<string, unknown>;
          allergens: string[];
          dark_mode: boolean;
          units: string;
          plan: string;
          onboarded: boolean;
          onboarding_step: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          image_url?: string | null;
          location?: string | null;
          height?: number | null;
          weight?: number | null;
          birthdate?: string | null;
          gender?: string | null;
          gender_desc?: string | null;
          diet?: string | null;
          activeness?: string | null;
          goals?: Record<string, unknown>;
          shopping?: Record<string, unknown>;
          allergens?: string[];
          dark_mode?: boolean;
          units?: string;
          plan?: string;
          onboarded?: boolean;
          onboarding_step?: number;
        };
        Update: {
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          image_url?: string | null;
          location?: string | null;
          height?: number | null;
          weight?: number | null;
          birthdate?: string | null;
          gender?: string | null;
          gender_desc?: string | null;
          diet?: string | null;
          activeness?: string | null;
          goals?: Record<string, unknown>;
          shopping?: Record<string, unknown>;
          allergens?: string[];
          dark_mode?: boolean;
          units?: string;
          plan?: string;
          onboarded?: boolean;
          onboarding_step?: number;
        };
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          updated_at?: string;
        };
      };
      meals: {
        Row: {
          id: string;
          meal_plan_id: string;
          user_id: string;
          recipe_id: string | null;
          title: string;
          description: string;
          meal_type: string;
          sort_order: number;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meal_plan_id?: string;
          user_id: string;
          recipe_id?: string | null;
          title: string;
          description?: string;
          meal_type?: string;
          sort_order?: number;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meal_plan_id?: string;
          recipe_id?: string | null;
          title?: string;
          description?: string;
          meal_type?: string;
          sort_order?: number;
          date?: string;
          updated_at?: string;
        };
      };
      meal_feedback: {
        Row: {
          id: string;
          meal_id: string;
          user_id: string;
          rating: number | null;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_id: string;
          user_id: string;
          rating?: number | null;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          rating?: number | null;
          comment?: string | null;
        };
      };
      recipes: {
        Row: {
          id: string;
          title: string;
          description: string;
          image_url: string | null;
          ingredients: string[];
          steps: string[];
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          servings: number | null;
          cuisine: string | null;
          diet_type: string | null;
          calories: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          image_url?: string | null;
          ingredients?: string[];
          steps?: string[];
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          servings?: number | null;
          cuisine?: string | null;
          diet_type?: string | null;
          calories?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          image_url?: string | null;
          ingredients?: string[];
          steps?: string[];
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          servings?: number | null;
          cuisine?: string | null;
          diet_type?: string | null;
          calories?: number | null;
          updated_at?: string;
        };
      };
      recipe_classifications: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          classification: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
          classification: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          classification?: string;
          updated_at?: string;
        };
      };
      recipe_reviews: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          rating: number;
          review_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
          rating: number;
          review_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rating?: number;
          review_text?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      classification_type: 'liked' | 'disliked' | 'favorited';
    };
  };
}

// Convenience type aliases
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type MealPlanRow = Database['public']['Tables']['meal_plans']['Row'];
export type MealRow = Database['public']['Tables']['meals']['Row'];
export type MealFeedbackRow = Database['public']['Tables']['meal_feedback']['Row'];
export type RecipeRow = Database['public']['Tables']['recipes']['Row'];
export type RecipeClassificationRow = Database['public']['Tables']['recipe_classifications']['Row'];
export type RecipeReviewRow = Database['public']['Tables']['recipe_reviews']['Row'];
