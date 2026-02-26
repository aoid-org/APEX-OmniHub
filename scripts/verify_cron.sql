-- Verify pg_cron receipt cleanup job is scheduled and running
-- Usage: psql $DATABASE_URL -f scripts/verify_cron.sql

SELECT jobid, jobname, schedule, command, nodename
FROM cron.job
WHERE jobname = 'clean-expired-receipts';

SELECT jobid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'clean-expired-receipts')
ORDER BY start_time DESC
LIMIT 10;
