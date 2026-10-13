-- Household setup: shopping habits and weekly budget belong to the household
-- (one shared budget and way of shopping), not to each person. The household
-- gets its own short setup (name, location, shopping, members), separate from
-- each person's onboarding.
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS shopping JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;
COMMENT ON COLUMN households.shopping IS 'Shopping habits and weekly budget: {tendency, priceSensitivity, budget}. Read with readShopping';

-- Any member can update these (households_update stays owner-only for name/plan)
CREATE OR REPLACE FUNCTION update_household_settings(hh_id UUID, new_shopping JSONB DEFAULT NULL, complete_setup BOOLEAN DEFAULT FALSE)
RETURNS households LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result households;
BEGIN
  IF NOT is_household_member(hh_id) THEN
    RAISE EXCEPTION 'not_member' USING ERRCODE = '42501';
  END IF;
  UPDATE households
     SET shopping = COALESCE(new_shopping, shopping),
         setup_completed_at = CASE WHEN complete_setup THEN COALESCE(setup_completed_at, now()) ELSE setup_completed_at END,
         updated_at = now()
   WHERE id = hh_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION update_household_settings(UUID, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_household_settings(UUID, JSONB, BOOLEAN) TO authenticated;

-- Carry over shopping answers members gave in onboarding (owner first)
UPDATE households h
   SET shopping = src.shopping
  FROM (
    SELECT DISTINCT ON (m.household_id) m.household_id, p.shopping
      FROM household_members m JOIN profiles p ON p.id = m.user_id
     WHERE p.shopping IS NOT NULL AND p.shopping <> '{}'::jsonb
     ORDER BY m.household_id, (m.role = 'owner') DESC, m.joined_at
  ) src
 WHERE h.id = src.household_id AND h.shopping = '{}'::jsonb;

-- Households that already have their details don't need the setup again
UPDATE households SET setup_completed_at = now()
 WHERE setup_completed_at IS NULL AND (location IS NOT NULL OR shopping <> '{}'::jsonb);

COMMENT ON COLUMN profiles.shopping IS 'Deprecated: shopping habits/budget are per household (households.shopping) since 00019';
