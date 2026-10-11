-- Ranked backup recipes saved with each generated meal, so the user can swap
-- instantly without regenerating. Each entry: {"recipeId", "title", "description"}.
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS alternatives JSONB NOT NULL DEFAULT '[]'::jsonb;
