-- Imported recipes (from a URL or pasted text).

-- Where an imported recipe came from, so the app can link back to it.
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Recipes were readable by everyone. With user imports that would expose one
-- person's recipes to every other user (and mix them into their Discover deck
-- and meal plans). Read the shared catalog, your own recipes and your
-- household's (shares_household_with is defined in 00005).
ALTER POLICY recipes_read ON recipes
  USING (created_by IS NULL OR created_by = auth.uid() OR shares_household_with(created_by));
