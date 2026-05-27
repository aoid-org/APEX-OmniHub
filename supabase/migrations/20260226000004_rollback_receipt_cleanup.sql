-- Rollback: Remove pg_cron receipt cleanup schedule
-- Safe to run even if job does not exist

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clean-expired-receipts') THEN
    PERFORM cron.unschedule('clean-expired-receipts');
  END IF;
END $$;

DROP INDEX IF EXISTS idx_idempotency_receipts_cleanup;
