-- Grocery store settings (which stores, strategy, max stores, Instacart
-- retailer) belong to the household: everyone shops the same stores.
ALTER TABLE households ADD COLUMN IF NOT EXISTS grocery_config JSONB NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN households.grocery_config IS 'Store settings shared by the household; read with readGroceryConfig. ZIP comes from households.postcode';

-- Any member can change them (households_update stays owner-only)
CREATE OR REPLACE FUNCTION set_household_grocery_config(hh_id UUID, cfg JSONB)
RETURNS households LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result households;
BEGIN
  IF NOT is_household_member(hh_id) THEN
    RAISE EXCEPTION 'not_member' USING ERRCODE = '42501';
  END IF;
  UPDATE households SET grocery_config = COALESCE(cfg, '{}'::jsonb), updated_at = now() WHERE id = hh_id RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION set_household_grocery_config(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_household_grocery_config(UUID, JSONB) TO authenticated;

-- Carry over what members set on their profiles (owner first)
UPDATE households h
   SET grocery_config = src.cfg
  FROM (
    SELECT DISTINCT ON (m.household_id) m.household_id, p.grocery_config AS cfg
      FROM household_members m JOIN profiles p ON p.id = m.user_id
     WHERE p.grocery_config IS NOT NULL AND p.grocery_config <> '{}'::jsonb
     ORDER BY m.household_id, (m.role = 'owner') DESC, m.joined_at
  ) src
 WHERE h.id = src.household_id AND h.grocery_config = '{}'::jsonb;

COMMENT ON COLUMN profiles.grocery_config IS 'Deprecated: store settings are per household (households.grocery_config) since 00021';
