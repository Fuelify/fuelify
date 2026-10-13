-- Location belongs to the household (everyone shops the same stores), not to
-- each person. Shown as "Woodstock, GA"; the postcode drives local store
-- prices; coordinates are rounded (~100 m) for nearest-store lookups.
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(6, 3),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(7, 3);

-- Any member can set the location (households_update is owner-only for the
-- name and plan), so it goes through this function.
CREATE OR REPLACE FUNCTION set_household_location(hh_id UUID, loc TEXT, zip TEXT, lat NUMERIC, lon NUMERIC)
RETURNS households LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result households;
BEGIN
  IF NOT is_household_member(hh_id) THEN
    RAISE EXCEPTION 'not_member' USING ERRCODE = '42501';
  END IF;
  UPDATE households
     SET location = NULLIF(btrim(loc), ''),
         postcode = NULLIF(btrim(zip), ''),
         latitude = round(lat, 3),
         longitude = round(lon, 3),
         updated_at = now()
   WHERE id = hh_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION set_household_location(UUID, TEXT, TEXT, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_household_location(UUID, TEXT, TEXT, NUMERIC, NUMERIC) TO authenticated;

-- Carry over what members already set on their profiles (owner first)
UPDATE households h
   SET location = src.location, postcode = src.zip
  FROM (
    SELECT DISTINCT ON (m.household_id) m.household_id, p.location, p.grocery_config->>'zipCode' AS zip
      FROM household_members m JOIN profiles p ON p.id = m.user_id
     WHERE p.location IS NOT NULL AND btrim(p.location) <> ''
     ORDER BY m.household_id, (m.role = 'owner') DESC, m.joined_at
  ) src
 WHERE h.id = src.household_id AND h.location IS NULL;

COMMENT ON COLUMN profiles.location IS 'Deprecated: location is per household (households.location) since 00017';
