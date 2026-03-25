-- ─── Wavult App — Supabase Storage Setup ─────────────────────────────────────
-- Run this in the Supabase SQL editor to create the avatars bucket.

-- Create the avatars bucket (public, so avatar URLs work without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Policy: users can upload their own avatar (file name = their user ID)
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IS NULL  -- root level only
    AND name LIKE auth.uid()::text || '.%'     -- filename must start with user ID
  );

-- Policy: users can update (overwrite) their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '.%'
  );

-- Policy: users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '.%'
  );

-- Policy: anyone can read avatars (public bucket)
CREATE POLICY "Public avatar access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
