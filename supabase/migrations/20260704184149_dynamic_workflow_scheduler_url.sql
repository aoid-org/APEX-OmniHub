-- ============================================================================
-- Workflow scheduler URL dynamic resolution migration
-- Replaces the hardcoded project_url with a dynamic vault secret lookup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dispatch_scheduled_workflows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wf RECORD;
  project_url TEXT;
  cron_secret TEXT;
BEGIN
  -- Retrieve dynamic project URL from vault
  SELECT decrypted_secret INTO project_url
    FROM vault.decrypted_secrets
    WHERE name = 'project_url'
    LIMIT 1;

  IF project_url IS NULL THEN
    RAISE WARNING 'dispatch_scheduled_workflows: project_url not found in vault, skipping this run';
    RETURN;
  END IF;

  -- Retrieve cron shared secret from vault
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
  'pg_cron target: fires execute-workflow for every due scheduled workflow. Dynamically resolves project_url and cron_shared_secret from vault.';
