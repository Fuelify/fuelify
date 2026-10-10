-- Household members can see each other's display profile (name, avatar),
-- e.g. "added by Teagan" on cart/pantry items and the household member list.
-- Previously profiles were readable only by their owner.

CREATE OR REPLACE FUNCTION shares_household_with(other_user UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM household_members mine
    JOIN household_members theirs ON theirs.household_id = mine.household_id
    WHERE mine.user_id = auth.uid() AND theirs.user_id = other_user
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY profiles_select_household ON profiles
  FOR SELECT USING (shares_household_with(id));
