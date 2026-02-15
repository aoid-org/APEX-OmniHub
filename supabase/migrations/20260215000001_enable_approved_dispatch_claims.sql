-- Migration: Enable approved task claims after enum value is committed

-- Rebuild claimable index to include approved tasks.
DROP INDEX IF EXISTS public.idx_omnilink_orchestration_claimable;

CREATE INDEX IF NOT EXISTS idx_omnilink_orchestration_claimable
  ON public.omnilink_orchestration_requests (integration_id, status, run_at)
  WHERE status IN ('queued', 'approved') AND worker_id IS NULL;

-- Replace claim RPC with a compact CTE-based implementation that claims
-- one eligible queued/approved task atomically.
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
  v_claimed record;
BEGIN
  WITH candidate AS (
    SELECT id, type, params, policy
    FROM public.omnilink_orchestration_requests
    WHERE integration_id = p_integration_id
      AND request_type = 'task'
      AND status IN ('queued', 'approved')
      AND worker_id IS NULL
      AND (run_at IS NULL OR run_at <= now())
      AND (p_target IS NULL OR params->>'target' = p_target)
    ORDER BY run_at NULLS FIRST, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.omnilink_orchestration_requests r
    SET status = 'running', worker_id = p_worker_id, claimed_at = now(), updated_at = now()
    FROM candidate c
    WHERE r.id = c.id
    RETURNING c.id, c.type, c.params, c.policy
  )
  SELECT * INTO v_claimed FROM claimed;

  IF v_claimed.id IS NULL THEN
    RETURN jsonb_build_object('status', 'no_tasks');
  END IF;

  RETURN jsonb_build_object(
    'status', 'claimed',
    'task_id', v_claimed.id,
    'type', v_claimed.type,
    'params', v_claimed.params,
    'policy', v_claimed.policy
  );
END;
$$;
