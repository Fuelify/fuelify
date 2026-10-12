-- Ingredient swaps on planned meals, and the household's grocery cart.

-- e.g. [{"original": "1 pound ground beef", "replacement": "1 pound ground turkey"}]
ALTER TABLE meals ADD COLUMN IF NOT EXISTS ingredient_swaps JSONB NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN meals.ingredient_swaps IS 'Per-meal ingredient swaps: [{original, replacement}] applied to the recipe''s ingredients';

-- One row per household: the built store cart (GroceryCart in
-- packages/shared/src/models/grocery-cart.ts) and list items skipped this week.
CREATE TABLE IF NOT EXISTS household_grocery (
  household_id UUID PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  cart JSONB,
  skipped_keys TEXT[] NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE household_grocery IS 'Per-household grocery state: the built store cart (see GroceryCart) and list items skipped this week';
ALTER TABLE household_grocery ENABLE ROW LEVEL SECURITY;
CREATE POLICY household_grocery_select ON household_grocery FOR SELECT USING (is_household_member(household_id));
CREATE POLICY household_grocery_insert ON household_grocery FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY household_grocery_update ON household_grocery FOR UPDATE USING (is_household_member(household_id));
CREATE TRIGGER update_household_grocery_updated_at
  BEFORE UPDATE ON household_grocery FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
