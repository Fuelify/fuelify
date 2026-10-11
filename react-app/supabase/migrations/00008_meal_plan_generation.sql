-- Auto-generated weekly meal plans (Premium).

-- Which meals a recipe suits, so the generator can fill breakfast/lunch/dinner/snack slots.
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS meal_types TEXT[] NOT NULL DEFAULT ARRAY['lunch', 'dinner']::text[];

-- Generated meals can be regenerated; meals the user added by hand are never replaced.
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS generated BOOLEAN NOT NULL DEFAULT false;

-- Per-user generator settings, edited on the Profile page.
-- Default: breakfast, lunch and dinner on; snacks off.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS meal_plan_config JSONB NOT NULL
  DEFAULT '{"slots": {"breakfast": true, "lunch": true, "dinner": true, "snack": false}}'::jsonb;
