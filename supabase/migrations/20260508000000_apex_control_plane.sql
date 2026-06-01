-- APEX Control Plane: replay-grade envelope, idempotency, compensation, and Guardian decisions.

CREATE TABLE IF NOT EXISTS apex_idempotency_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'global',
  idempotency_key TEXT NOT NULL,
  intent_hash TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  actor_id UUID NULL REFERENCES auth.users(id) ,
  device_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'duplicate', 'stale', 'compensated')),
  stale_after TIMESTAMPTZ NOT NULL,
  attempt INT NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  policy_version TEXT NOT NULL,
  compensation_ref TEXT NULL,
  request_hash TEXT NOT NULL,
  response_payload JSONB NULL,
  outcome_code TEXT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_apex_idempotency_scope_key UNIQUE (scope, idempotency_key),
  CONSTRAINT uq_apex_idempotency_scope_intent UNIQUE (scope, intent_hash)
);

CREATE INDEX IF NOT EXISTS idx_apex_idempotency_trace ON apex_idempotency_ledger(trace_id, correlation_id);
CREATE INDEX IF NOT EXISTS idx_apex_idempotency_actor ON apex_idempotency_ledger(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apex_idempotency_stale_after ON apex_idempotency_ledger(stale_after);

ALTER TABLE apex_idempotency_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages apex idempotency ledger"
  ON apex_idempotency_ledger FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users view own apex idempotency receipts"
  ON apex_idempotency_ledger FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION apex_claim_idempotency(
  p_scope TEXT,
  p_idempotency_key TEXT,
  p_intent_hash TEXT,
  p_trace_id TEXT,
  p_correlation_id TEXT,
  p_actor_id UUID,
  p_device_id TEXT,
  p_operation TEXT,
  p_stale_after TIMESTAMPTZ,
  p_attempt INT,
  p_policy_version TEXT,
  p_compensation_ref TEXT,
  p_request_hash TEXT
) RETURNS TABLE(outcome TEXT, ledger_id UUID, response_payload JSONB, outcome_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing apex_idempotency_ledger%ROWTYPE;
  c_status_pending CONSTANT TEXT := 'pending';
  c_status_duplicate CONSTANT TEXT := 'duplicate';
  c_status_stale CONSTANT TEXT := 'stale';
  c_outcome_duplicate CONSTANT TEXT := 'DUPLICATE_DELIVERY';
  c_outcome_stale CONSTANT TEXT := 'STALE_EVENT';
BEGIN
  IF p_idempotency_key IS NULL OR p_idempotency_key = '' OR p_intent_hash IS NULL OR p_intent_hash = '' OR p_stale_after IS NULL THEN
    RAISE EXCEPTION 'missing_mutation_envelope_fields';
  END IF;

  SELECT * INTO existing
  FROM apex_idempotency_ledger
  WHERE scope = p_scope AND idempotency_key = p_idempotency_key
  LIMIT 1;

  IF FOUND THEN
    UPDATE apex_idempotency_ledger
    SET last_seen_at = now(), attempt = GREATEST(attempt, p_attempt), status = CASE WHEN status = c_status_pending THEN status ELSE c_status_duplicate END
    WHERE id = existing.id;
    RETURN QUERY SELECT c_status_duplicate, existing.id, existing.response_payload, COALESCE(existing.outcome_code, c_outcome_duplicate);
    RETURN;
  END IF;

  IF p_stale_after <= now() THEN
    INSERT INTO apex_idempotency_ledger(scope, idempotency_key, intent_hash, trace_id, correlation_id, actor_id, device_id, operation, status, stale_after, attempt, policy_version, compensation_ref, request_hash, outcome_code)
    VALUES (p_scope, p_idempotency_key, p_intent_hash, p_trace_id, p_correlation_id, p_actor_id, p_device_id, p_operation, c_status_stale, p_stale_after, p_attempt, p_policy_version, p_compensation_ref, p_request_hash, c_outcome_stale)
    RETURNING * INTO existing;
    RETURN QUERY SELECT c_status_stale, existing.id, existing.response_payload, c_outcome_stale;
    RETURN;
  END IF;

  INSERT INTO apex_idempotency_ledger(scope, idempotency_key, intent_hash, trace_id, correlation_id, actor_id, device_id, operation, status, stale_after, attempt, policy_version, compensation_ref, request_hash)
  VALUES (p_scope, p_idempotency_key, p_intent_hash, p_trace_id, p_correlation_id, p_actor_id, p_device_id, p_operation, c_status_pending, p_stale_after, p_attempt, p_policy_version, p_compensation_ref, p_request_hash)
  RETURNING * INTO existing;

  RETURN QUERY SELECT 'accepted'::TEXT, existing.id, existing.response_payload, 'ACCEPTED'::TEXT;
END;
$$;

-- SECURITY DEFINER RPCs are executable by PUBLIC by default; keep this server-side control-plane claim path service-role only.
REVOKE EXECUTE ON FUNCTION public.apex_claim_idempotency(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apex_claim_idempotency(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apex_claim_idempotency(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apex_claim_idempotency(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT) TO service_role;

CREATE TABLE IF NOT EXISTS apex_compensation_catalog (
  compensation_ref TEXT PRIMARY KEY CHECK (compensation_ref LIKE 'apex.comp.%'),
  owner TEXT NOT NULL,
  description TEXT NOT NULL,
  workflow_step TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE apex_compensation_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages apex compensation catalog"
  ON apex_compensation_catalog FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated users can read enabled apex compensations"
  ON apex_compensation_catalog FOR SELECT TO authenticated
  USING (enabled = true);

CREATE TABLE IF NOT EXISTS apex_policy_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal UUID NULL REFERENCES auth.users(id) ,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'deny')),
  determining_policy_id TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apex_policy_decisions_trace ON apex_policy_decisions(trace_id, correlation_id);
CREATE INDEX IF NOT EXISTS idx_apex_policy_decisions_principal ON apex_policy_decisions(principal) WHERE principal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apex_policy_decisions_denies ON apex_policy_decisions(reason_code) WHERE decision = 'deny';

ALTER TABLE apex_policy_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages apex policy decisions"
  ON apex_policy_decisions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users view own apex policy decisions"
  ON apex_policy_decisions FOR SELECT TO authenticated
  USING (principal = auth.uid());

CREATE TABLE IF NOT EXISTS apex_performance_budgets (
  route TEXT PRIMARY KEY,
  lcp_ms INT NOT NULL DEFAULT 2500 CHECK (lcp_ms <= 2500),
  inp_ms INT NOT NULL DEFAULT 200 CHECK (inp_ms <= 200),
  cls NUMERIC NOT NULL DEFAULT 0.1 CHECK (cls <= 0.1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE apex_performance_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read apex performance budgets"
  ON apex_performance_budgets FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "service role manages apex performance budgets"
  ON apex_performance_budgets FOR ALL TO service_role
  USING (true) WITH CHECK (true);
