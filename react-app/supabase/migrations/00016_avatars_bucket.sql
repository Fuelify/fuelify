-- Profile pictures: public bucket `avatars`, one folder per user
-- (`<user id>/avatar-<time>.jpg`). Anyone can view (they're shown to household
-- members and in shared lists); only the owner can add, replace or remove
-- files in their own folder. The app resizes to 512px JPEG before uploading,
-- and stores the public URL in profiles.image_url.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY avatars_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_update_own ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
-- Listing a folder (used to clean up old pictures) — own folder only; public URLs don't need this
CREATE POLICY avatars_select_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
