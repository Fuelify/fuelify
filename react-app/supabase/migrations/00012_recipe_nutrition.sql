-- Per-serving nutrition beyond calories (which stays in recipes.calories).
-- Keys: proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg — any may be missing.
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition JSONB NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN recipes.nutrition IS 'Per serving: proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg (calories stays in recipes.calories)';
