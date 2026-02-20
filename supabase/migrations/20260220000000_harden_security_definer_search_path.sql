-- ============================================================================
-- Migration: Harden SECURITY DEFINER functions — add SET search_path = ''
-- ============================================================================
-- Several SECURITY DEFINER functions were created without SET search_path,
-- leaving them vulnerable to search_path hijacking (PostgreSQL privilege
-- escalation via unqualified search path).
--
-- This migration recreates each affected function with:
--   SET search_path = ''
--   Explicit public. schema qualification on all table/type references
--
-- Also fixes a pre-existing bug in audit_emergency_controls_changes():
--   Column 'action'     -> 'action_type'  (correct audit_logs column name)
--   Column 'ip_address' removed           (does not exist in audit_logs)
--
-- Also upgrades cleanup_old_audit_logs from SET search_path = public to ''.
--
-- Affected source migrations:
--   20251218000000_create_audit_logs_table.sql  (cleanup_old_audit_logs)
--   20260101000000_create_web3_verification.sql (cleanup_expired_nonces)
--   20260103000000_create_emergency_controls.sql (6 functions)
--   20260107000000_create_paid_access_system.sql (3 functions)
--   20260124000000_omniport_dlq.sql             (3 functions)
--   20260125000001_enable_omega_security.sql    (insert_agent_event_idempotent)
--
-- Author: OmniLink APEX
-- Date: 2026-02-20
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 0. audit_logs cleanup function (20251218) — upgrade SET search_path = public -> ''
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. emergency_controls helper functions (20260103)
-- ──────────────────────────────────────────────────────────────────────────────

-- Bug fix bundled: original used wrong column names ('action', 'ip_address')
-- which would cause INSERT to fail at runtime. Fixed to match actual schema.
CREATE OR REPLACE FUNCTION public.audit_emergency_controls_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    action_type,
    resource_type,
    resource_id,
    metadata,
    actor_id
  ) VALUES (
    'emergency_control_updated',
    'emergency_controls',
    NEW.id::text,
    jsonb_build_object(
      'old_state', jsonb_build_object(
        'kill_switch', OLD.kill_switch,
        'safe_mode', OLD.safe_mode,
        'operator_takeover', OLD.operator_takeover,
        'allowed_operations', OLD.allowed_operations
      ),
      'new_state', jsonb_build_object(
        'kill_switch', NEW.kill_switch,
        'safe_mode', NEW.safe_mode,
        'operator_takeover', NEW.operator_takeover,
        'allowed_operations', NEW.allowed_operations
      ),
      'reason', NEW.reason,
      'timestamp', now()
    ),
    NEW.updated_by
  );

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_kill_switch_enabled()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT kill_switch INTO is_enabled
  FROM public.emergency_controls
  WHERE id = '00000000-0000-0000-0000-000000000001';

  RETURN COALESCE(is_enabled, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_safe_mode_enabled()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT safe_mode INTO is_enabled
  FROM public.emergency_controls
  WHERE id = '00000000-0000-0000-0000-000000000001';

  RETURN COALESCE(is_enabled, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_operator_takeover_enabled()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT operator_takeover INTO is_enabled
  FROM public.emergency_controls
  WHERE id = '00000000-0000-0000-0000-000000000001';

  RETURN COALESCE(is_enabled, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_operation_allowed(operation_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_takeover_enabled BOOLEAN;
  allowed_ops TEXT[];
BEGIN
  SELECT operator_takeover, allowed_operations
  INTO is_takeover_enabled, allowed_ops
  FROM public.emergency_controls
  WHERE id = '00000000-0000-0000-0000-000000000001';

  IF NOT is_takeover_enabled THEN
    RETURN true;
  END IF;

  RETURN operation_name = ANY(allowed_ops);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_emergency_controls_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  status jsonb;
BEGIN
  SELECT jsonb_build_object(
    'kill_switch', kill_switch,
    'safe_mode', safe_mode,
    'operator_takeover', operator_takeover,
    'allowed_operations', allowed_operations,
    'last_updated', updated_at,
    'updated_by', updated_by,
    'reason', reason
  ) INTO status
  FROM public.emergency_controls
  WHERE id = '00000000-0000-0000-0000-000000000001';

  RETURN COALESCE(status, '{}'::jsonb);
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. web3_verification cleanup function (20260101)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_expired_nonces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.wallet_nonces
  WHERE expires_at < now() - interval '1 hour';
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. paid_access_system functions (20260107)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_paid_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND tier IN ('starter', 'pro', 'enterprise')
      AND status IN ('active', 'trialing', 'canceled')
      AND (
        (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
        OR
        (status = 'trialing' AND trial_end > now())
        OR
        (status = 'canceled' AND current_period_end > now())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id uuid)
RETURNS public.subscription_tier
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT tier FROM public.subscriptions
      WHERE user_id = _user_id
        AND status IN ('active', 'trialing', 'canceled')
        AND (
          (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
          OR (status = 'trialing' AND trial_end > now())
          OR (status = 'canceled' AND current_period_end > now())
        )
      LIMIT 1
    ),
    'free'::public.subscription_tier
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. omniport_dlq functions (20260124)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_pending_dlq_entries(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  correlation_id TEXT,
  raw_input JSONB,
  error_reason TEXT,
  risk_score INTEGER,
  created_at TIMESTAMPTZ,
  retry_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c_pending constant public.dlq_status := 'pending';
BEGIN
  RETURN QUERY
  SELECT
    ib.id,
    ib.correlation_id,
    ib.raw_input,
    ib.error_reason,
    ib.risk_score,
    ib.created_at,
    ib.retry_count
  FROM public.ingress_buffer ib
  WHERE ib.status = c_pending
  ORDER BY ib.risk_score DESC, ib.created_at ASC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_dlq_entries_for_replay(
  p_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
  c_pending constant public.dlq_status := 'pending';
  c_replaying constant public.dlq_status := 'replaying';
BEGIN
  UPDATE public.ingress_buffer
  SET
    status = c_replaying,
    last_retry_at = NOW(),
    retry_count = retry_count + 1
  WHERE id = ANY(p_ids) AND status = c_pending;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_dlq_entries(
  p_retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
  c_failed constant public.dlq_status := 'failed';
BEGIN
  DELETE FROM public.ingress_buffer
  WHERE status = c_failed
    AND created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. omega_security event function (20260125)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.insert_agent_event_idempotent(
    p_session_id TEXT,
    p_sequence_id INTEGER,
    p_type TEXT,
    p_payload JSONB,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO public.agent_events (
        session_id,
        sequence_id,
        type,
        payload,
        user_id
    )
    VALUES (
        p_session_id,
        p_sequence_id,
        p_type,
        p_payload,
        p_user_id
    )
    ON CONFLICT (session_id, sequence_id)
    DO UPDATE SET id = public.agent_events.id  -- no-op: forces RETURNING on conflict
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;
