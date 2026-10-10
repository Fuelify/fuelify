-- Let a household owner add an existing Fuelify user by email.
-- Clients can't read auth.users, so the lookup runs as SECURITY DEFINER and
-- only after checking the caller owns the household. Errors use stable
-- messages the app maps to friendly text.

CREATE OR REPLACE FUNCTION add_household_member_by_email(hh_id UUID, member_email TEXT)
RETURNS household_members AS $$
DECLARE
  target UUID;
  result household_members;
BEGIN
  IF NOT is_household_owner(hh_id) THEN
    RAISE EXCEPTION 'not_household_owner' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO target
  FROM auth.users
  WHERE lower(email) = lower(trim(member_email)) AND COALESCE(is_anonymous, false) = false
  LIMIT 1;

  IF target IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (SELECT 1 FROM household_members WHERE household_id = hh_id AND user_id = target) THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = '23505';
  END IF;

  INSERT INTO household_members (household_id, user_id, role)
  VALUES (hh_id, target, 'member')
  RETURNING * INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION add_household_member_by_email(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_household_member_by_email(UUID, TEXT) TO authenticated;
