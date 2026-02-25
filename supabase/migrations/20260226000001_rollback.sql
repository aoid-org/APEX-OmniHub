-- Rollback: remove pg_cron receipts cleanup job
-- Safe to run multiple times (idempotent unschedule).

SELECT cron.unschedule('clean-receipts');

-- Drop the cleanup index (if exists)
DROP INDEX IF EXISTS idx_receipts_cleanup;
