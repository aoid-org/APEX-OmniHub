-- Migration: OmniLink Scheduled Tasks (Safe, Idempotent, Atomic)
-- ----------------------------------------------------------------------------
-- 1. Schema Additions
-- ----------------------------------------------------------------------------

-- Add run_at for scheduling (null = immediate)
ALTER TABLE public.omnilink_orchestration_requests
  ADD COLUMN IF NOT EXISTS run_at timestamptz;

-- Index for efficient "Due" scanning
CREATE INDEX IF NOT EXISTS idx_omnilink_tasks_due
  ON public.omnilink_orchestration_requests (status, run_at, created_at)
  WHERE type = 'apex.task';

-- ----------------------------------------------------------------------------
-- 2. Atomic Claim RPC
-- ----------------------------------------------------------------------------
-- Claims queued/due tasks for a specific tenant/integration.
-- USES: FOR UPDATE SKIP LOCKED for true atomicity (no double-claims)

CREATE OR REPLACE FUNCTION public.apex_tasks_claim(
  p_integration_id uuid,
  p_limit int DEFAULT 10,
  p_worker_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  type text,
  status public.omnilink_req_status,
  params jsonb,
  policy jsonb,
  run_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.omnilink_orchestration_requests
  SET
    status = 'running'::public.omnilink_req_status,
    updated_at = now(),
    policy = coalesce(policy, '{}'::jsonb) || jsonb_build_object(
      'claimed_by', p_worker_id,
      'claimed_at', now()
    )
  WHERE id IN (
    SELECT r.id
    FROM public.omnilink_orchestration_requests r
    WHERE r.integration_id = p_integration_id
      AND r.type = 'apex.task'
      AND r.status = 'queued'
      AND (r.run_at IS NULL OR r.run_at <= now())
    ORDER BY coalesce(r.run_at, r.created_at) ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    omnilink_orchestration_requests.id,
    omnilink_orchestration_requests.type,
    omnilink_orchestration_requests.status,
    omnilink_orchestration_requests.params,
    omnilink_orchestration_requests.policy,
    omnilink_orchestration_requests.run_at;
END;
$$;

-- Secure the claim function
REVOKE ALL ON FUNCTION public.apex_tasks_claim(uuid, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apex_tasks_claim(uuid, int, text) TO service_role;

-- ----------------------------------------------------------------------------
-- 3. Patch Ingest RPC (Handle Tasks + Approvals + Scheduling)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.omnilink_ingest(
  p_api_key_id uuid,
  p_integration_id uuid,
  p_tenant_id uuid,
  p_request_type text,
  p_envelope jsonb,
  p_idempotency_key text,
  p_max_rpm int,
  p_entity jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz := date_trunc('minute', now());
  v_new_count int;
  v_retry_after int;
  v_status text;
  v_record_id uuid;
  v_envelope_id text := p_envelope->>'id';
  v_source text := p_envelope->>'source';
  v_type text := p_envelope->>'type';
  v_subject text := p_envelope->>'subject';
  v_time timestamptz := (p_envelope->>'time')::timestamptz;
  v_dataschema text := p_envelope->>'dataschema';

  -- Task specific extractions
  v_policy jsonb := p_envelope->'policy';
  v_params jsonb := p_envelope->'params';
  v_req_approval boolean := (v_policy->>'require_approval')::boolean;
  v_run_at timestamptz := NULL;

  -- Constants
  c_status constant text := 'status';
  c_queued constant text := 'queued';
  c_waiting_approval constant text := 'waiting_approval';
  c_denied constant text := 'denied';
  c_rate_limited constant text := 'rate_limited';
  c_duplicate constant text := 'duplicate';
BEGIN
  -- Rate limit check
  INSERT INTO public.omnilink_rate_limits(api_key_id, window_start, request_count)
  VALUES (p_api_key_id, v_window_start, 1)
  ON CONFLICT (api_key_id, window_start)
  DO UPDATE SET request_count = public.omnilink_rate_limits.request_count + 1
  RETURNING request_count INTO v_new_count;

  IF p_max_rpm IS NOT NULL AND v_new_count > p_max_rpm THEN
    v_retry_after := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_window_start + interval '1 minute' - now()))));
    RETURN jsonb_build_object(
      c_status, c_rate_limited,
      'retry_after_seconds', v_retry_after
    );
  END IF;

  IF p_request_type = 'event' THEN
    INSERT INTO public.omnilink_events(
      tenant_id,
      integration_id,
      api_key_id,
      envelope_id,
      idempotency_key,
      source,
      type,
      subject,
      time,
      dataschema,
      data,
      entity
    ) VALUES (
      p_tenant_id,
      p_integration_id,
      p_api_key_id,
      v_envelope_id,
      p_idempotency_key,
      v_source,
      v_type,
      NULLIF(v_subject, ''),
      v_time,
      NULLIF(v_dataschema, ''),
      p_envelope->'data',
      p_envelope->'entity'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_record_id;

    IF v_record_id IS NULL THEN
      RETURN jsonb_build_object(c_status, c_duplicate);
    END IF;

    IF p_entity IS NOT NULL THEN
      INSERT INTO public.omnilink_entities(
        tenant_id,
        integration_id,
        entity_type,
        external_id,
        display_name,
        last_event_id
      ) VALUES (
        p_tenant_id,
        p_integration_id,
        p_entity->>'type',
        p_entity->>'external_id',
        p_entity->>'display_name',
        v_record_id
      )
      ON CONFLICT (integration_id, entity_type, external_id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        last_event_id = EXCLUDED.last_event_id,
        updated_at = now();
    END IF;

    INSERT INTO public.audit_logs(actor_id, action_type, resource_type, resource_id, metadata)
    VALUES (NULL, 'omnilink.event.ingested', 'omnilink_event', v_record_id::text, jsonb_build_object('integration_id', p_integration_id));

    v_status := 'ingested';
  ELSE
    -- Extract run_at logic
    IF v_policy ? 'run_at' THEN
      v_run_at := (v_policy->>'run_at')::timestamptz;
    ELSIF v_params ? 'run_at' THEN
       v_run_at := (v_params->>'run_at')::timestamptz;
    END IF;

    -- Determine initial status based on approval requirement
    IF v_req_approval IS TRUE THEN
        v_status := c_waiting_approval;
    ELSE
        v_status := c_queued;
    END IF;

    INSERT INTO public.omnilink_orchestration_requests(
      tenant_id,
      integration_id,
      api_key_id,
      request_type,
      envelope_id,
      idempotency_key,
      source,
      type,
      time,
      target,
      params,
      policy,
      run_at,
      status
    ) VALUES (
      p_tenant_id,
      p_integration_id,
      p_api_key_id,
      p_request_type,
      v_envelope_id,
      p_idempotency_key,
      v_source,
      v_type,
      v_time,
      p_envelope->'target',
      v_params,
      v_policy,
      v_run_at,
      v_status::public.omnilink_req_status
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_record_id;

    IF v_record_id IS NULL THEN
      -- If duplicate, check current status to return consistent response
       SELECT status::text INTO v_status FROM public.omnilink_orchestration_requests
       WHERE integration_id = p_integration_id AND idempotency_key = p_idempotency_key;

       -- If found, return that, otherwise generic duplicate (should act mostly as success/idempotent)
       IF v_status IS NULL THEN
          v_status := c_duplicate;
       END IF;
       
       -- We return the existing record_id if we can find it
       SELECT id INTO v_record_id FROM public.omnilink_orchestration_requests
       WHERE integration_id = p_integration_id AND idempotency_key = p_idempotency_key;
    ELSE
       INSERT INTO public.audit_logs(actor_id, action_type, resource_type, resource_id, metadata)
       VALUES (NULL, 'omnilink.orchestration.queued', 'omnilink_orchestration', v_record_id::text, jsonb_build_object('integration_id', p_integration_id, 'type', v_type));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    c_status, v_status,
    'record_id', v_record_id
  );
END;
$$;
