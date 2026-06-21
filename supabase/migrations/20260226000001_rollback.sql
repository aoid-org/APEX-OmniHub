-- Rollback: remove pg_cron receipts cleanup job
-- Safe to run multiple times (truly idempotent unschedule).
--
-- NOTE: cron.unschedule(name) raises XX000 ("could not find valid entry
-- for job") when the named job does not exist, so the previous bare
-- SELECT cron.unschedule(...) was NOT idempotent and broke `db push`
-- whenever the job was absent. Guard with an existence check, and guard
-- the whole block on the cron schema being present so this migration is
-- safe regardless of pg_cron availability or apply order.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'cron'
  ) AND EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'clean-receipts'
  ) THEN
    PERFORM cron.unschedule('clean-receipts');
  END IF;
END $$;

-- Drop the cleanup index (if exists)
DROP INDEX IF EXISTS idx_receipts_cleanup;
