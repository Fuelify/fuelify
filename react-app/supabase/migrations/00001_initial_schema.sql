-- Fuelify — Supabase/PostgreSQL schema
-- All app data lives here: user profiles, settings, meal plans, recipes, reviews.
-- Authentication is handled by Supabase Auth (auth.users).

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE classification_type AS ENUM ('liked', 'disliked', 'favorited');

-- ============================================================
-- USER PROFILES
-- Extends Supabase Auth (auth.users) with app-specific profile data.
-- A row is auto-created via trigger when a user signs up.
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  image_url TEXT,
  location TEXT,

  -- Personal details (onboarding)
  height DOUBLE PRECISION,
  weight DOUBLE PRECISION,
  birthdate DATE,
  gender TEXT,
  gender_desc TEXT,

  -- Nutrition preferences (onboarding)
  diet TEXT,
  activeness TEXT,
  goals JSONB DEFAULT '{}'::jsonb,       -- { all: [], primary: "", target: "", weekly: "" }
  shopping JSONB DEFAULT '{}'::jsonb,    -- { tendency: "", priceSensitivity: "", budget: "" }
  allergens JSONB DEFAULT '[]'::jsonb,   -- ["gluten", "dairy", ...]

  -- App settings
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  units TEXT NOT NULL DEFAULT 'Imperial', -- 'Imperial' | 'Metric'
  plan TEXT NOT NULL DEFAULT 'Free',

  -- Onboarding state
  onboarded BOOLEAN NOT NULL DEFAULT false,
  onboarding_step INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- MEAL PLANS
-- ============================================================

CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, date)
);

CREATE INDEX idx_meal_plans_user_date ON meal_plans (user_id, date);

CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  meal_type meal_type NOT NULL DEFAULT 'dinner',
  sort_order INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meals_user_date ON meals (user_id, date);
CREATE INDEX idx_meals_plan_id ON meals (meal_plan_id);

CREATE TABLE meal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, meal_id)
);

-- ============================================================
-- RECIPES
-- ============================================================

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER,
  cuisine TEXT,
  diet_type TEXT,
  calories INTEGER,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_cuisine ON recipes (cuisine);
CREATE INDEX idx_recipes_diet_type ON recipes (diet_type);
CREATE INDEX idx_recipes_created_by ON recipes (created_by);
CREATE INDEX idx_recipes_search ON recipes
  USING gin (to_tsvector('english', title || ' ' || description));

-- ============================================================
-- RECIPE CLASSIFICATIONS (like / dislike / favorite)
-- ============================================================

CREATE TABLE recipe_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  classification classification_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, recipe_id)
);

CREATE INDEX idx_classifications_user ON recipe_classifications (user_id, classification);

-- ============================================================
-- RECIPE REVIEWS
-- ============================================================

CREATE TABLE recipe_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, recipe_id)
);

CREATE INDEX idx_reviews_recipe ON recipe_reviews (recipe_id);

-- ============================================================
-- ROW LEVEL SECURITY — all policies use auth.uid()
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Meal plans: users own their own
CREATE POLICY meal_plans_policy ON meal_plans FOR ALL USING (user_id = auth.uid());
CREATE POLICY meals_policy ON meals FOR ALL USING (user_id = auth.uid());
CREATE POLICY meal_feedback_policy ON meal_feedback FOR ALL USING (user_id = auth.uid());

-- Recipes: anyone authenticated can read, only creator can modify
CREATE POLICY recipes_read ON recipes FOR SELECT USING (true);
CREATE POLICY recipes_insert ON recipes FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY recipes_update ON recipes FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY recipes_delete ON recipes FOR DELETE USING (created_by = auth.uid());

-- Classifications & reviews: users own their own
CREATE POLICY classifications_policy ON recipe_classifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY reviews_policy ON recipe_reviews FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON meals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classifications_updated_at
  BEFORE UPDATE ON recipe_classifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON recipe_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
