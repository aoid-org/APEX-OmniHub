-- APEX-OmniHub: Circuit Breaker State Persistence (P1)
-- Persists CB state across worker restarts for observability
--
-- The UI (Ops.tsx) derives CB status from memory metrics.
-- This table stores authoritative CB state per-tenant per-service.
--
-- States: CLOSED (healthy), HALF_OPEN (testing), OPEN (tripped)
-- Workers write state; dashboard reads state.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'cb_state_enum'
  ) THEN
    CREATE TYPE public.cb_state_enum AS ENUM (
      'CLOSED', 'HALF_OPEN', 'OPEN' -- NOSONAR
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  tenant_id UUID NOT NULL,
  service_name TEXT NOT NULL,

  -- State
  state public.cb_state_enum NOT NULL DEFAULT 'CLOSED',
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,

  -- Config (per-service overrides)
  failure_threshold INTEGER NOT NULL DEFAULT 5,
  recovery_timeout_ms INTEGER NOT NULL DEFAULT 30000,
  half_open_max_attempts INTEGER NOT NULL DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per tenant per service
  UNIQUE(tenant_id, service_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cb_state_tenant
  ON public.circuit_breaker_state(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cb_state_open
  ON public.circuit_breaker_state(state)
  WHERE state != 'CLOSED';

-- RLS
ALTER TABLE public.circuit_breaker_state
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY cb_state_tenant_select
  ON public.circuit_breaker_state
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_jwt_tenant_id()
  );

-- Service role: full CRUD (workers manage state)
CREATE POLICY cb_state_service_role
  ON public.circuit_breaker_state
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Upsert function for workers to update CB state atomically
CREATE OR REPLACE FUNCTION public.upsert_circuit_breaker(
  p_tenant_id UUID,
  p_service TEXT,
  p_state public.cb_state_enum,
  p_failure_count INTEGER DEFAULT 0,
  p_success_count INTEGER DEFAULT 0
)
RETURNS public.cb_state_enum
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_state public.cb_state_enum;
BEGIN
  INSERT INTO public.circuit_breaker_state (
    tenant_id, service_name, state,
    failure_count, success_count,
    opened_at, last_failure_at, last_success_at
  ) VALUES (
    p_tenant_id, p_service, p_state,
    p_failure_count, p_success_count,
    CASE WHEN p_state = 'OPEN' THEN NOW() ELSE NULL END,
    CASE WHEN p_failure_count > 0 THEN NOW() ELSE NULL END,
    CASE WHEN p_success_count > 0 THEN NOW() ELSE NULL END
  )
  ON CONFLICT (tenant_id, service_name) DO UPDATE SET
    state = EXCLUDED.state,
    failure_count = EXCLUDED.failure_count,
    success_count = EXCLUDED.success_count,
    opened_at = CASE
      WHEN EXCLUDED.state = 'OPEN'
        AND circuit_breaker_state.state != 'OPEN'
      THEN NOW()
      ELSE circuit_breaker_state.opened_at
    END,
    last_failure_at = CASE
      WHEN EXCLUDED.failure_count > 0 THEN NOW()
      ELSE circuit_breaker_state.last_failure_at
    END,
    last_success_at = CASE
      WHEN EXCLUDED.success_count > 0 THEN NOW()
      ELSE circuit_breaker_state.last_success_at
    END,
    updated_at = NOW()
  RETURNING state INTO result_state;

  RETURN result_state;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER handle_cb_state_updated_at
  BEFORE UPDATE ON public.circuit_breaker_state
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.circuit_breaker_state IS
  'Persists circuit breaker state across worker restarts. '
  'One record per tenant per service. Workers upsert; '
  'dashboard reads.';
COMMENT ON FUNCTION public.upsert_circuit_breaker IS
  'Atomic upsert for CB state. Tracks opened_at only on '
  'CLOSED→OPEN transitions.';

-- Permissions
GRANT SELECT ON public.circuit_breaker_state TO authenticated;
GRANT ALL ON public.circuit_breaker_state TO service_role;
