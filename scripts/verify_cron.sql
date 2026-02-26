-- Verify pg_cron receipts cleanup job status
-- Run: psql -f scripts/verify_cron.sql

-- 1. Confirm job is registered
SELECT jobid, jobname, schedule, command, active
  FROM cron.job
 WHERE jobname = 'clean-receipts';

-- 2. Show recent run history (last 10 executions)
SELECT jobid, job_pid, status, return_message,
       start_time, end_time
  FROM cron.job_run_details
 WHERE jobname = 'clean-receipts'
 ORDER BY start_time DESC
 LIMIT 10;
