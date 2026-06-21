-- Migration: Enable pg_cron and schedule automatic receipt cleanup
-- Cleans processed idempotency_receipts older than 30 days daily at 03:00 UTC
-- Idempotent: safe to re-run

-- 1. Enable pg_cron extension (requires Supabase Dashboard → Advanced → Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Cleanup index for efficient deletion scans
CREATE INDEX IF NOT EXISTS idx_idempotency_receipts_cleanup
  ON idempotency_receipts(created_at, expires_at);

-- 3. Schedule daily cleanup (idempotent guard)
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clean-expired-receipts') THEN
    PERFORM cron.schedule(
      'clean-expired-receipts',
      '0 3 * * *',
      $$DELETE FROM idempotency_receipts WHERE expires_at < NOW() AND created_at < NOW() - INTERVAL '30 days';$$
    );
  END IF;
END $do$;
