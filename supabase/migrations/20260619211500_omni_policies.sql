-- ============================================================================
-- OmniPolicy governance table: public.omni_policies
-- Consumed by orchestrator/security/omni_policy.py::_load_from_db
-- Loader selects: name, version, priority, match, decision, lane, reason WHERE enabled
-- Matching (orchestrator): exact-array membership on match.{tool|action|resource|data_class}_in
--   (case-insensitive, AND across present fields; absent field = wildcard).
--   Policies are evaluated in priority ASC order; FIRST match wins; no match => ALLOW.
-- Decisions: ALLOW (proceed) | DEFER (manual approval / MAN mode) | DENY (block, non-retryable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.omni_policies (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL UNIQUE,
    version     int  NOT NULL DEFAULT 1,
    priority    int  NOT NULL DEFAULT 100,
    match       jsonb NOT NULL DEFAULT '{}'::jsonb,
    decision    text NOT NULL DEFAULT 'ALLOW' CHECK (decision IN ('ALLOW','DEFER','DENY')),
    lane        text NOT NULL DEFAULT 'GREEN' CHECK (lane IN ('GREEN','YELLOW','RED','BLOCKED')),
    reason      text NOT NULL DEFAULT 'No reason provided',
    enabled     boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omni_policies_enabled  ON public.omni_policies(enabled);
CREATE INDEX IF NOT EXISTS idx_omni_policies_priority ON public.omni_policies(priority);

-- RLS: service-role (orchestrator worker) bypasses RLS for reads; authenticated may read.
-- Writes are restricted to service-role / migrations only (no authenticated write policy).
ALTER TABLE public.omni_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "omni_policies_select_authenticated" ON public.omni_policies;
CREATE POLICY "omni_policies_select_authenticated"
    ON public.omni_policies FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- APEX Business Systems Ltd — tailored policy set.
-- Philosophy: block genuine danger, defer high-impact irreversible/PII actions for
-- human approval, and ALLOW everything else (reads, conversation, normal writes)
-- so execution quality is never throttled. Lower priority = evaluated first.
-- Idempotent: ON CONFLICT (name) DO UPDATE keeps the table in sync with this file.
-- ============================================================================

INSERT INTO public.omni_policies (name, version, priority, match, decision, lane, reason) VALUES

-- 10 — Hard-block deletion of protected/system tables (irreversible data loss).
('deny_delete_protected_tables', 1, 10,
 '{"tool_in":["delete_record"],"resource_in":["agent_runs","audit_logs","audit_log","profiles","users","auth_users","auth.users","payments","billing","subscriptions","invoices","provider_connections","idempotency_ledger","pilot_sessions","omni_policies","agent_policies","secrets","api_keys","credentials"]}'::jsonb,
 'DENY','BLOCKED','Deletion of protected/system/financial tables is prohibited for the agent.'),

-- 15 — Hard-block writes that tamper with governance / audit tables.
('deny_write_governance_tables', 1, 15,
 '{"tool_in":["create_record","delete_record"],"resource_in":["omni_policies","agent_policies","audit_logs","audit_log"]}'::jsonb,
 'DENY','BLOCKED','Agent may not modify governance or audit tables.'),

-- 20 — Hard-block any action classified as touching secrets/credentials.
('deny_secret_or_credential_data', 1, 20,
 '{"data_class_in":["secret","secrets","credential","credentials","api_key","apikey","password","private_key","token","service_role"]}'::jsonb,
 'DENY','BLOCKED','Handling of secret/credential-classified data is prohibited.'),

-- 30 — Defer (human approval) actions on PII / financial / health-classified data.
('defer_pii_financial_health_data', 1, 30,
 '{"data_class_in":["pii","personal","sensitive","phi","health","financial","payment","payments"]}'::jsonb,
 'DEFER','RED','Actions on PII/financial/health-classified data require manual approval (MAN mode).'),

-- 40 — Defer any remaining record deletion (reversible-but-impactful) for approval.
('defer_record_deletion', 1, 40,
 '{"tool_in":["delete_record"]}'::jsonb,
 'DEFER','RED','Record deletion requires manual approval before execution.'),

-- 60 — Always allow read-only and conversational actions (fast path, no friction).
('allow_read_and_conversational', 1, 60,
 '{"tool_in":["respond_to_user","search_database","search_youtube"]}'::jsonb,
 'ALLOW','GREEN','Read-only and conversational actions are always permitted.'),

-- 70 — Always allow internal lifecycle/system activities.
('allow_system_internal', 1, 70,
 '{"tool_in":["update_agent_run_completion","mint_pilot_session","evaluate_policy","risk_triage"]}'::jsonb,
 'ALLOW','GREEN','System-internal lifecycle activities are permitted.')

ON CONFLICT (name) DO UPDATE SET
    version    = EXCLUDED.version,
    priority   = EXCLUDED.priority,
    match      = EXCLUDED.match,
    decision   = EXCLUDED.decision,
    lane       = EXCLUDED.lane,
    reason     = EXCLUDED.reason,
    enabled    = true,
    updated_at = now();

-- Normal writes (create_record, send_email, call_webhook) intentionally have NO policy:
-- they fall through to the default ALLOW and are then classified/audited by MAN-mode
-- risk_triage (YELLOW = execute with audit). This keeps everyday automation unthrottled.
