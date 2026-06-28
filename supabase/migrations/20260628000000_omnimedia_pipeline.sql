-- OmniMedia pipeline — additive only (contract §7). Safe to run multiple times.
-- Creates: public.omnimedia_assets (RLS, owner-scoped) + private omnimedia-assets
-- storage bucket + user-prefixed storage.objects policies.
-- NO destructive operations (no DROP TABLE / DROP COLUMN / data deletion).

-- ── Table: public.omnimedia_assets ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.omnimedia_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('video', 'audio')),
  -- Uploaded assets reference a private storage object; external (register) assets
  -- reference an embed/source URL. Exactly one source is expected per row.
  storage_path  text,
  bucket        text,
  external_url  text,
  provider      text,
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS omnimedia_assets_owner_idx
  ON public.omnimedia_assets (owner_user_id, created_at DESC);

-- RLS: owners see/manage only their own assets.
ALTER TABLE public.omnimedia_assets ENABLE ROW LEVEL SECURITY;

-- additive-allow: DROP_POLICY idempotent re-create; CREATE POLICY IF NOT EXISTS is invalid Postgres syntax
DROP POLICY IF EXISTS "omnimedia_assets_owner_select" ON public.omnimedia_assets;
CREATE POLICY "omnimedia_assets_owner_select"
  ON public.omnimedia_assets FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

-- additive-allow: DROP_POLICY idempotent re-create
DROP POLICY IF EXISTS "omnimedia_assets_owner_insert" ON public.omnimedia_assets;
CREATE POLICY "omnimedia_assets_owner_insert"
  ON public.omnimedia_assets FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- additive-allow: DROP_POLICY idempotent re-create
DROP POLICY IF EXISTS "omnimedia_assets_owner_update" ON public.omnimedia_assets;
CREATE POLICY "omnimedia_assets_owner_update"
  ON public.omnimedia_assets FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- additive-allow: DROP_POLICY idempotent re-create
DROP POLICY IF EXISTS "omnimedia_assets_owner_delete" ON public.omnimedia_assets;
CREATE POLICY "omnimedia_assets_owner_delete"
  ON public.omnimedia_assets FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- ── Storage bucket: omnimedia-assets (private) ───────────────────────────────
DO $$
DECLARE
  v_bucket_name text := 'omnimedia-assets'; -- NOSONAR
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    v_bucket_name,
    v_bucket_name,
    false,
    209715200, -- 200 MB max per media file
    ARRAY['video/mp4','video/webm','video/ogg',
          'audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm']
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- RLS: owner can only access their own prefix ({userId}/...). Mirrors omnihub-files.
-- additive-allow: DROP_POLICY idempotent re-create
DROP POLICY IF EXISTS "omnimedia_assets_obj_select" ON storage.objects;
CREATE POLICY "omnimedia_assets_obj_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'omnimedia-assets' AND (storage.foldername(name))[1] = auth.uid()::text); -- NOSONAR

-- additive-allow: DROP_POLICY idempotent re-create
DROP POLICY IF EXISTS "omnimedia_assets_obj_insert" ON storage.objects;
CREATE POLICY "omnimedia_assets_obj_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'omnimedia-assets' AND (storage.foldername(name))[1] = auth.uid()::text); -- NOSONAR

-- additive-allow: DROP_POLICY idempotent re-create
DROP POLICY IF EXISTS "omnimedia_assets_obj_delete" ON storage.objects;
CREATE POLICY "omnimedia_assets_obj_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'omnimedia-assets' AND (storage.foldername(name))[1] = auth.uid()::text); -- NOSONAR
