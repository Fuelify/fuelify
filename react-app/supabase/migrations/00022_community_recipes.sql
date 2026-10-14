-- Community: recipe photos people add, and anonymous stats across all users
-- (likes, favorites, times cooked, trending). Stats are counts only; nobody
-- can see who liked or cooked what.

-- Photos for a recipe: the stock image lives on recipes.image_url; these are
-- extra photos members upload ("how mine turned out").
CREATE TABLE IF NOT EXISTS recipe_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('stock', 'user')),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recipe_images_recipe ON recipe_images (recipe_id, created_at DESC);
ALTER TABLE recipe_images ENABLE ROW LEVEL SECURITY;
-- Visible to anyone who can see the recipe (recipes' own RLS applies in the subquery)
CREATE POLICY recipe_images_read ON recipe_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id));
CREATE POLICY recipe_images_add ON recipe_images FOR INSERT TO authenticated
  WITH CHECK (source = 'user' AND uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id));
CREATE POLICY recipe_images_remove ON recipe_images FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Storage: public bucket, each user writes only under their own folder
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recipe-photos', 'recipe-photos', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY recipe_photos_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recipe-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY recipe_photos_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Community stats for some recipes. "Cooked" = on someone's plan for a day
-- that has come (last 30 days). Trending = most likes/favorites/cooks in the
-- last 7 days across all recipes (top 10, at least 2 that week).
CREATE OR REPLACE FUNCTION recipe_community_stats(ids UUID[])
RETURNS TABLE (recipe_id UUID, likes INT, favorites INT, cooked_30d INT, trending BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH week AS (
    SELECT r.recipe_id, count(*) AS n FROM (
      SELECT c.recipe_id FROM recipe_classifications c
       WHERE c.classification IN ('liked', 'favorited') AND c.updated_at > now() - interval '7 days'
      UNION ALL
      SELECT m.recipe_id FROM meals m
       WHERE m.recipe_id IS NOT NULL AND m.date BETWEEN current_date - 7 AND current_date
    ) r GROUP BY r.recipe_id
  ),
  top AS (
    SELECT w.recipe_id FROM week w WHERE w.n >= 2 ORDER BY w.n DESC LIMIT 10
  )
  SELECT u.rid AS recipe_id,
    (SELECT count(*) FROM recipe_classifications c WHERE c.recipe_id = u.rid AND c.classification = 'liked')::int,
    (SELECT count(*) FROM recipe_classifications c WHERE c.recipe_id = u.rid AND c.classification = 'favorited')::int,
    (SELECT count(*) FROM meals m WHERE m.recipe_id = u.rid AND m.date BETWEEN current_date - 30 AND current_date)::int,
    EXISTS (SELECT 1 FROM top t WHERE t.recipe_id = u.rid)
  FROM unnest(ids) AS u(rid);
$$;
REVOKE ALL ON FUNCTION recipe_community_stats(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recipe_community_stats(UUID[]) TO authenticated;
