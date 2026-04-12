-- Fuelify — Supabase/PostgreSQL schema
-- This handles all non-auth data (meal plans, recipes, food discovery, reviews).
-- Auth, user profiles, and settings remain in DynamoDB.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE classification_type AS ENUM ('liked', 'disliked', 'favorited');

-- ============================================================
-- MEAL PLANS
-- ============================================================

-- One row per user per date
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,          -- References DynamoDB user ID
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, date)
);

CREATE INDEX idx_meal_plans_user_date ON meal_plans (user_id, date);

-- Individual meals within a plan
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  recipe_id UUID,                 -- Nullable FK to recipes
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

-- Feedback on individual meals
CREATE TABLE meal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
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
  created_by TEXT,                 -- DynamoDB user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_cuisine ON recipes (cuisine);
CREATE INDEX idx_recipes_diet_type ON recipes (diet_type);
CREATE INDEX idx_recipes_created_by ON recipes (created_by);

-- Full-text search index on title + description
CREATE INDEX idx_recipes_search ON recipes
  USING gin (to_tsvector('english', title || ' ' || description));

-- ============================================================
-- RECIPE CLASSIFICATIONS (like / dislike / favorite)
-- ============================================================

CREATE TABLE recipe_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
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
  user_id TEXT NOT NULL,
  recipe_id UUID NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, recipe_id)
);

CREATE INDEX idx_reviews_recipe ON recipe_reviews (recipe_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- RLS policies use the user_id column (matched against the JWT sub claim
-- from our DynamoDB-issued tokens). The Supabase client is initialized
-- with the user's access token so auth.uid() maps to our user_id.

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_reviews ENABLE ROW LEVEL SECURITY;
-- recipes are readable by all authenticated users
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Meal plans: users can only access their own
CREATE POLICY meal_plans_user_policy ON meal_plans
  FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY meals_user_policy ON meals
  FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY meal_feedback_user_policy ON meal_feedback
  FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Recipes: anyone can read, only creator can modify
CREATE POLICY recipes_read_policy ON recipes
  FOR SELECT USING (true);

CREATE POLICY recipes_write_policy ON recipes
  FOR ALL USING (created_by = current_setting('request.jwt.claims', true)::json->>'sub');

-- Classifications & reviews: users own their own
CREATE POLICY classifications_user_policy ON recipe_classifications
  FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY reviews_user_policy ON recipe_reviews
  FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classifications_updated_at
  BEFORE UPDATE ON recipe_classifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON recipe_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
