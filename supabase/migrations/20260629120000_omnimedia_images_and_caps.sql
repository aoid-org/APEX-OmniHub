-- OmniMedia — add image support + tighten per-file size. Additive, idempotent.
-- Caps that depend on per-user aggregates (5 uploads/day, 25 MB total) are
-- enforced in the omnilink-port edge function (omnimedia-ingest-from-upload),
-- since they are dynamic per-caller checks, not static column constraints.
-- NO destructive operations (no DROP TABLE / DROP COLUMN / data deletion).

-- ── Allow kind = 'image' alongside video/audio ───────────────────────────────
-- additive-allow: DROP_CONSTRAINT idempotent re-create of a CHECK (no data loss;
-- the new constraint is a strict superset of the old allowed set).
ALTER TABLE public.omnimedia_assets
  DROP CONSTRAINT IF EXISTS omnimedia_assets_kind_check;
ALTER TABLE public.omnimedia_assets
  ADD CONSTRAINT omnimedia_assets_kind_check
  CHECK (kind IN ('video', 'audio', 'image'));

-- ── Bucket: allow image MIME types; cap per-file at 25 MB (matches total cap) ─
DO $$
BEGIN
  UPDATE storage.buckets
  SET
    file_size_limit = 26214400, -- 25 MB per file (no single file can exceed the per-user total cap)
    allowed_mime_types = ARRAY[
      'video/mp4','video/webm','video/ogg',
      'audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm',
      'image/jpeg','image/png','image/webp','image/gif','image/avif'
    ]
  WHERE id = 'omnimedia-assets';
END $$;
