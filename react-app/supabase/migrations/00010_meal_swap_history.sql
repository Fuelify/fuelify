-- recipes.meal_types is ordered: the first entry is the preferred slot
-- (e.g. Avocado Toast: breakfast, then lunch, then dinner).
COMMENT ON COLUMN recipes.meal_types IS 'Slots the recipe suits; first entry is the preferred slot';

-- Recipes already shown for a generated meal while shuffling. When the saved
-- options run out, a fresh batch is generated that skips these.
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS seen_recipe_ids TEXT[] NOT NULL DEFAULT '{}'::text[];
