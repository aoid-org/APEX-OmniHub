-- pg_cron Receipts Cleanup
-- Idempotent migration: creates extension, index, and scheduled job
-- only if they do not already exist.
--
-- Runs nightly at 03:00 UTC: removes processed receipts older than 30 days.

DO $$
BEGIN
  -- Guard: skip if job already registered
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'clean-receipts'
  ) THEN
    -- Enable pg_cron extension (idempotent)
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    -- Partial index for the cleanup query
    CREATE INDEX IF NOT EXISTS idx_receipts_cleanup
      ON receipts (created_at, status);

    -- Schedule: every day at 03:00 UTC
    PERFORM cron.schedule(
      'clean-receipts',
      '0 3 * * *',
      -- additive-allow: DELETE_FROM Clean up processed receipts older than 30 days
      $$DELETE FROM receipts
        WHERE created_at < NOW() - INTERVAL '30 days'
          AND status = 'processed';$$
    );

    RAISE NOTICE 'pg_cron job "clean-receipts" created.';
  END IF;
END $$;
