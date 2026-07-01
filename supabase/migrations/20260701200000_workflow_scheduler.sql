-- ============================================================================
-- Workflow scheduler: real pg_cron-driven autonomous execution of workflows
-- with workflows.schedule set to one of a small, fixed preset ('every_5_min',
-- 'hourly', 'daily'). No Temporal/orchestrator involvement — the scheduler
-- calls the same execute-workflow edge function the manual "Trigger Run"
-- button already uses, authenticating with a shared secret
-- (CRON_SHARED_SECRET, checked against the X-Cron-Secret header) instead of
-- a user JWT, since pg_cron has no logged-in user. execute-workflow then
-- scopes strictly to that workflow row's own user_id — the cron job can only
-- ever act as the workflow's real owner, never as an arbitrary user.
-- ============================================================================

-- Constrain schedule to the presets the scheduler function understands. Any
-- existing NULL (manual, the default) or unrecognised value is left alone —
-- this is additive, not a data migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflows_schedule_preset_check'
  ) THEN
    ALTER TABLE public.workflows
      ADD CONSTRAINT workflows_schedule_preset_check
      CHECK (schedule IS NULL OR schedule IN ('every_5_min', 'hourly', 'daily'));
  END IF;
END $$;

-- Runs every 5 minutes. For each active, scheduled workflow that's due (no
-- run yet, or its last run is older than the preset's interval), fires an
-- async HTTP POST to execute-workflow via pg_net — non-blocking, the cron
-- job itself never waits on workflow execution.
CREATE OR REPLACE FUNCTION public.dispatch_scheduled_workflows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wf RECORD;
  project_url TEXT := 'https://rtopreovkywofgwgmozi.supabase.co';
  cron_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets
    WHERE name = 'cron_shared_secret'
    LIMIT 1;

  IF cron_secret IS NULL THEN
    RAISE WARNING 'dispatch_scheduled_workflows: cron_shared_secret not found in vault, skipping this run';
    RETURN;
  END IF;

  FOR wf IN
    SELECT w.id, w.schedule
    FROM public.workflows w
    LEFT JOIN LATERAL (
      SELECT created_at
      FROM public.workflow_runs r
      WHERE r.workflow_id = w.id
      ORDER BY r.created_at DESC
      LIMIT 1
    ) last_run ON true
    WHERE w.is_active = true
      AND w.schedule IS NOT NULL
      AND (
        w.schedule = 'every_5_min'
        OR (w.schedule = 'hourly' AND (last_run.created_at IS NULL OR last_run.created_at < NOW() - INTERVAL '55 minutes'))
        OR (w.schedule = 'daily'  AND (last_run.created_at IS NULL OR last_run.created_at < NOW() - INTERVAL '23 hours'))
      )
  LOOP
    PERFORM net.http_post(
      url := project_url || '/functions/v1/execute-workflow',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', cron_secret
      ),
      body := jsonb_build_object('workflowId', wf.id)
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.dispatch_scheduled_workflows IS
  'pg_cron target: fires execute-workflow for every due scheduled workflow. Runs every 5 minutes via the workflow-scheduler cron job.';

-- Schedule (idempotent — unschedule any prior job of the same name first so
-- re-running this migration doesn't create duplicates).
DO $$
BEGIN
  PERFORM cron.unschedule('workflow-scheduler');
EXCEPTION WHEN OTHERS THEN
  NULL; -- no prior job to unschedule
END $$;

SELECT cron.schedule(
  'workflow-scheduler',
  '*/5 * * * *',
  $$SELECT public.dispatch_scheduled_workflows();$$
);
