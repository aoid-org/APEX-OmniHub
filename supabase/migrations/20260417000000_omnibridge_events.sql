-- =============================================================================
-- OmniBridge Events — SBBL-HQ & Partner Integration Persistence Layer (v1.6.0)
-- =============================================================================
-- Durable event log for all OmniBridge ingestions (hardened + sync-packet
-- profiles). Feeds the Alberta Innovates grant evidence trail, live-event
-- dashboard, and orchestrator dispatch queue.
--
-- Tenant isolation via RLS (tenant_id). Service role bypasses for the Edge
-- ingress writer and outbound dispatcher.
-- =============================================================================

-- Enum for ingest profile (extend only; never rename existing values)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnibridge_profile') THEN
    CREATE TYPE omnibridge_profile AS ENUM ('hardened', 'sync_packet', 'legacy');
  END IF;
END$$;

-- Enum for dispatch state (ingested -> dispatched -> acknowledged | dlq)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnibridge_dispatch_state') THEN
    CREATE TYPE omnibridge_dispatch_state AS ENUM (
      'received',     -- NOSONAR: enum value, cannot be extracted to a SQL constant
      'dispatching',
      'dispatched',
      'acknowledged', -- NOSONAR: enum value, cannot be extracted to a SQL constant
      'dlq'
    );
  END IF;
END$$;

-- =============================================================================
-- omnibridge_events — the canonical durable log
-- =============================================================================
CREATE TABLE IF NOT EXISTS omnibridge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  profile omnibridge_profile NOT NULL,
  event_type TEXT NOT NULL,
  trace_id TEXT,
  idempotency_key TEXT,
  payload JSONB NOT NULL,
  raw_headers JSONB,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  dispatch_state omnibridge_dispatch_state NOT NULL DEFAULT 'received',
  dispatch_target TEXT,
  dispatch_attempts INTEGER NOT NULL DEFAULT 0,
  dispatch_last_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  -- Enforce per-source idempotency on event_id to reject replays at the DB
  CONSTRAINT omnibridge_events_source_event_unique UNIQUE (source_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_omnibridge_events_tenant_received
  ON omnibridge_events (tenant_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_omnibridge_events_source_type_received
  ON omnibridge_events (source_id, event_type, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_omnibridge_events_dispatch_pending
  ON omnibridge_events (dispatch_state, received_at ASC)
  WHERE dispatch_state IN ('received', 'dispatching');

CREATE INDEX IF NOT EXISTS idx_omnibridge_events_trace
  ON omnibridge_events (trace_id)
  WHERE trace_id IS NOT NULL;

ALTER TABLE omnibridge_events ENABLE ROW LEVEL SECURITY;

-- Service role: unrestricted (ingest writer + dispatcher)
CREATE POLICY "omnibridge_events_service_all"
  ON omnibridge_events FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- Authenticated admins (jwt custom claim tenant_id) can read their tenant's events
CREATE POLICY "omnibridge_events_tenant_read"
  ON omnibridge_events FOR SELECT TO authenticated
  USING (
    tenant_id = COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
      ''
    )
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'operator')
    )
  );

-- =============================================================================
-- omnibridge_events_dlq — outbound dispatch failures
-- =============================================================================
CREATE TABLE IF NOT EXISTS omnibridge_events_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_uuid UUID NOT NULL REFERENCES omnibridge_events(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  error_message TEXT NOT NULL,
  http_status INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_omnibridge_events_dlq_next_retry
  ON omnibridge_events_dlq (next_retry_at ASC)
  WHERE next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_omnibridge_events_dlq_event_uuid
  ON omnibridge_events_dlq (event_uuid);

ALTER TABLE omnibridge_events_dlq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "omnibridge_events_dlq_service_all"
  ON omnibridge_events_dlq FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- =============================================================================
-- omnibridge_control_audit — every control-plane command (incl. hotfixes)
-- =============================================================================
-- High-risk actions (hotfix_dispatch, emergency_halt) require MAN approval.
-- This audit log is append-only and integrity-chained via prev_hash.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnibridge_control_action') THEN
    CREATE TYPE omnibridge_control_action AS ENUM (
      'disable_stream',
      'enable_stream',
      'revoke_access',
      'grant_access',
      'emergency_halt',
      'broadcast_message',
      'force_man_review',
      'hotfix_dispatch'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnibridge_control_state') THEN
    CREATE TYPE omnibridge_control_state AS ENUM (
      'requested',
      'awaiting_man_approval',
      'approved',
      'denied',
      'dispatched',
      'acknowledged',
      'failed'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS omnibridge_control_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id TEXT NOT NULL UNIQUE,
  target_source TEXT NOT NULL,
  action omnibridge_control_action NOT NULL,
  risk_lane TEXT NOT NULL CHECK (risk_lane IN ('GREEN', 'YELLOW', 'RED', 'BLOCKED')),
  state omnibridge_control_state NOT NULL DEFAULT 'requested',
  requested_by UUID,
  approved_by UUID,
  reason TEXT NOT NULL,
  payload JSONB NOT NULL,
  target_file_allowlist TEXT[],   -- for hotfix_dispatch: explicit file glob list
  rollback_snapshot JSONB,        -- captured pre-dispatch state for hotfix reverts
  response_payload JSONB,
  prev_hash TEXT,
  entry_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_omnibridge_control_audit_state
  ON omnibridge_control_audit (state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_omnibridge_control_audit_target
  ON omnibridge_control_audit (target_source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_omnibridge_control_audit_action_risk
  ON omnibridge_control_audit (action, risk_lane, created_at DESC);

ALTER TABLE omnibridge_control_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "omnibridge_control_audit_service_all"
  ON omnibridge_control_audit FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- Admins can read audit records
CREATE POLICY "omnibridge_control_audit_admin_read"
  ON omnibridge_control_audit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'operator')
    )
  );

-- =============================================================================
-- Grant-evidence materialized view (cheap aggregate reads for live dashboard)
-- =============================================================================
CREATE OR REPLACE VIEW omnibridge_event_stats_hourly AS
SELECT
  source_id,
  date_trunc('hour', received_at) AS hour,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE signature_verified) AS verified_events,
  COUNT(*) FILTER (WHERE dispatch_state = 'acknowledged') AS ack_events,
  COUNT(*) FILTER (WHERE dispatch_state = 'dlq') AS dlq_events,
  COUNT(DISTINCT event_type) AS distinct_event_types,
  EXTRACT(EPOCH FROM AVG(acknowledged_at - received_at)) * 1000 AS avg_round_trip_ms,
  EXTRACT(EPOCH FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY acknowledged_at - received_at)) * 1000 AS p95_round_trip_ms
FROM omnibridge_events
WHERE received_at > NOW() - INTERVAL '30 days'
GROUP BY source_id, date_trunc('hour', received_at);

COMMENT ON TABLE omnibridge_events IS 'OmniBridge durable event log (v1.6.0) - feeds dispatch, audit, and grant evidence.';
COMMENT ON TABLE omnibridge_events_dlq IS 'Failed outbound dispatches. Retried with exponential backoff.';
COMMENT ON TABLE omnibridge_control_audit IS 'Append-only audit log for control-plane commands. Hash-chained for integrity.';
COMMENT ON VIEW omnibridge_event_stats_hourly IS 'Hourly rollups for live dashboard + Alberta Innovates grant evidence.';
