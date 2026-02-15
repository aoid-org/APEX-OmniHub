-- Migration: Enable approved task claims after enum value is committed
-- This migration runs after 20260201000000_omnilink_task_dispatch.sql to safely
-- reference the new enum value in index predicates and claim logic.

-- Rebuild claimable index to include approved tasks.
DROP INDEX IF EXISTS public.idx_omnilink_orchestration_claimable;

CREATE INDEX IF NOT EXISTS idx_omnilink_orchestration_claimable ON public.omnilink_orchestration_requests(
  integration_id, status, run_at
) WHERE status IN ('queued', 'approved') AND worker_id IS NULL;

-- Update claim RPC to allow both queued and approved tasks.
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
