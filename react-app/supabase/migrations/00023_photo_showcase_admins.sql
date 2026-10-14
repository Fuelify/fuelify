-- Member photos are private to the person who added them until an admin
-- showcases them; showcased photos are shown to everyone (recipe gallery and
-- Discover cards). Admins are listed in app_admins.

CREATE TABLE IF NOT EXISTS app_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;
-- People can see whether they themselves are an admin; nobody can add rows from the app
CREATE POLICY app_admins_self ON app_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION is_app_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION is_app_admin() TO authenticated;

ALTER TABLE recipe_images
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS recipe_images_featured ON recipe_images (recipe_id) WHERE featured;

-- Your own photos, showcased photos (of recipes you can see), or everything for admins
ALTER POLICY recipe_images_read ON recipe_images
  USING (uploaded_by = auth.uid() OR is_app_admin() OR (featured AND EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id)));
-- New photos start private
ALTER POLICY recipe_images_add ON recipe_images
  WITH CHECK (source = 'user' AND uploaded_by = auth.uid() AND NOT featured AND EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id));
-- Remove your own; admins can remove any
ALTER POLICY recipe_images_remove ON recipe_images
  USING (uploaded_by = auth.uid() OR is_app_admin());
CREATE POLICY recipe_photos_delete_admin ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-photos' AND is_app_admin());

CREATE OR REPLACE FUNCTION set_recipe_image_featured(image_id UUID, on_off BOOLEAN)
RETURNS recipe_images LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result recipe_images;
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  UPDATE recipe_images
     SET featured = on_off,
         featured_by = CASE WHEN on_off THEN auth.uid() ELSE NULL END,
         featured_at = CASE WHEN on_off THEN now() ELSE NULL END
   WHERE id = image_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION set_recipe_image_featured(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_recipe_image_featured(UUID, BOOLEAN) TO authenticated;

-- First admins: the owner's accounts
INSERT INTO app_admins (user_id)
SELECT id FROM auth.users WHERE email IN ('etminier@outlook.com', 'ethan@fuelifyyourlife.com')
ON CONFLICT DO NOTHING;
