-- Migration: OmniLink Task Dispatch & Telemetry Enhancement
-- Extends orchestration_requests for task dispatch (claim/complete)
-- Validates omnilink_events schema for local agent telemetry

-- Add 'task' to request_type enum
ALTER TYPE public.omnilink_req_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TABLE public.omnilink_orchestration_requests DROP CONSTRAINT IF EXISTS omnilink_orchestration_requests_request_type_check;
ALTER TABLE public.omnilink_orchestration_requests ADD CONSTRAINT omnilink_orchestration_requests_request_type_check
  CHECK (request_type IN ('command', 'workflow', 'task'));

-- Add task dispatch fields
ALTER TABLE public.omnilink_orchestration_requests
  ADD COLUMN IF NOT EXISTS run_at timestamptz,
  ADD COLUMN IF NOT EXISTS worker_id text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS output jsonb,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Index for claimable tasks (atomic claim query)
CREATE INDEX IF NOT EXISTS idx_omnilink_orchestration_claimable ON public.omnilink_orchestration_requests(
  integration_id, status, run_at
) WHERE status IN ('queued', 'approved') AND worker_id IS NULL;

-- Index for telemetry queries (events table already has most needed indexes)
CREATE INDEX IF NOT EXISTS idx_omnilink_events_source_type_time ON public.omnilink_events(
  integration_id, source, type, time DESC
);

-- RPC: Atomic task claim (concurrency-safe)
CREATE OR REPLACE FUNCTION public.omnilink_claim_task(
  p_integration_id uuid,
  p_worker_id text,
  p_target text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_record record;
  v_running_status constant public.omnilink_req_status := 'running';
  v_status_key constant text := 'status';
  c_queued constant public.omnilink_req_status := 'queued';
  c_approved constant public.omnilink_req_status := 'approved';
  c_task_type constant text := 'task';
BEGIN
  -- Atomic claim: find one eligible task and claim it
  UPDATE public.omnilink_orchestration_requests
  SET
    status = v_running_status,
    worker_id = p_worker_id,
    claimed_at = now(),
    updated_at = now()
  WHERE id = (
    SELECT id
    FROM public.omnilink_orchestration_requests
    WHERE integration_id = p_integration_id
      AND request_type = c_task_type
      AND status IN (c_queued, c_approved)
      AND worker_id IS NULL
      AND (run_at IS NULL OR run_at <= now())
      AND (p_target IS NULL OR params->>'target' = p_target)
    ORDER BY run_at NULLS FIRST, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id, type, params, policy INTO v_task_record;

  IF v_task_record.id IS NULL THEN
    RETURN jsonb_build_object(v_status_key, 'no_tasks');
  END IF;

  RETURN jsonb_build_object(
    v_status_key, 'claimed',
    'task_id', v_task_record.id,
    'type', v_task_record.type,
    'params', v_task_record.params,
    'policy', v_task_record.policy
  );
END;
$$;

-- RPC: Complete task (idempotent)
CREATE OR REPLACE FUNCTION public.omnilink_complete_task(
  p_task_id uuid,
  p_worker_id text,
  p_status text,
  p_output jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count int;
  v_final_status public.omnilink_req_status;
  v_running_status constant public.omnilink_req_status := 'running';
  v_succeeded_status constant public.omnilink_req_status := 'succeeded';
  v_failed_status constant public.omnilink_req_status := 'failed';
  v_status_key constant text := 'status';
BEGIN
  -- Validate status
  IF p_status NOT IN ('succeeded', 'failed') THEN
    RETURN jsonb_build_object(v_status_key, 'invalid_status');
  END IF;

  v_final_status := p_status::public.omnilink_req_status;

  -- Update task (idempotent: only if currently running and owned by this worker)
  UPDATE public.omnilink_orchestration_requests
  SET
    status = v_final_status,
    output = p_output,
    error_message = p_error_message,
    updated_at = now()
  WHERE id = p_task_id
    AND worker_id = p_worker_id
    AND status = v_running_status;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    -- Check if already completed
    IF EXISTS (
      SELECT 1 FROM public.omnilink_orchestration_requests
      WHERE id = p_task_id
        AND worker_id = p_worker_id
        AND status IN (v_succeeded_status, v_failed_status)
    ) THEN
      RETURN jsonb_build_object(v_status_key, 'already_completed');
    END IF;
    RETURN jsonb_build_object(v_status_key, 'not_found_or_not_owned');
  END IF;

  INSERT INTO public.audit_logs(actor_id, action_type, resource_type, resource_id, metadata)
  VALUES (NULL, 'omnilink.task.completed', 'omnilink_task', p_task_id::text, jsonb_build_object('worker_id', p_worker_id, 'final_status', p_status));

  RETURN jsonb_build_object(v_status_key, 'completed', 'final_status', p_status);
END;
$$;
