-- Create files storage bucket if not exists
-- Idempotent: safe to run multiple times
DO $$
DECLARE
  v_bucket_name text := 'omnihub-files';
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    v_bucket_name,
    v_bucket_name,
    false,
    52428800, -- 50 MB max per file
    ARRAY['image/*','application/pdf','text/*','application/json',
          'application/zip','application/octet-stream']
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- RLS: tenant can only access their own prefix
CREATE POLICY IF NOT EXISTS "omnihub_files_tenant_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'omnihub-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "omnihub_files_tenant_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'omnihub-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "omnihub_files_tenant_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'omnihub-files' AND (storage.foldername(name))[1] = auth.uid()::text);
