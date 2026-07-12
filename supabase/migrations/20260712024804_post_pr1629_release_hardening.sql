-- =============================================================================
-- post_pr1629_release_hardening — RECONCILIATION FILE (2026-07-12)
-- =============================================================================
-- HONESTY NOTE: this migration was originally applied directly against
-- production (2026-07-10/11, PR #1629 remediation session) via the Supabase
-- Management API, not via a committed file — production's
-- supabase_migrations.schema_migrations already has a row for version
-- 20260712024804 / name "post_pr1629_release_hardening", which is why every
-- `supabase db push` since had failed with "Remote migration versions not
-- found in local migrations directory."
--
-- This file is a RECONSTRUCTION, not a recovered original: it was built by
-- introspecting the live database on 2026-07-12 and cross-referencing
-- AUDIT.md's description of what that session fixed. It reproduces the
-- confirmed live end-state; it is not guaranteed byte-identical to whatever
-- SQL was actually executed live. Every statement is idempotent/guarded so
-- it is safe to (re)run on production (already correct — no-op) and on a
-- fresh/shadow database (where 20260303000000_create_memories_table.sql
-- already creates all of this correctly — also a no-op).
--
-- CORRUPTION NOTE (2026-07-12): the commit merged via PR #1633 was silently
-- truncated mid-statement (cut off inside the memory_health_stats view body)
-- by a file-sync issue between the agent's edit tool and its shell. CI's
-- text-based additive-migrations gate didn't catch it (truncation occurred
-- after the last line it checked), but `supabase db push` did. This version
-- was written and verified end-to-end in a single shell pass with explicit
-- dollar-quote-balance and COMMIT-terminator checks.
--
-- Scope, per AUDIT.md's two findings for this session:
--   1. "Live Supabase exposed internal SECURITY DEFINER worker/control RPCs
--      and allowed several user-ID RPCs without caller binding... Security
--      advisor reduced from 40 findings to 11." — confirmed live: 7 RPCs
--      (activate_client_subscription, dispatch_scheduled_workflows,
--      enforce_skill_entitlement, increment_rate_limit,
--      omnitrace_get_run_bundle, omnitrace_insert_event,
--      omnitrace_upsert_run) are SECURITY DEFINER and currently granted to
--      postgres/service_role only (no anon/authenticated). Section 1 below
--      reasserts that grant state.
--   2. "Production migration history recorded the memory subsystem, but
--      public.memories, memory_health_stats, and get_jwt_tenant_id() were
--      absent... Canonical table, enums, RLS, indexes, helper, and
--      security-invoker view restored live." — Section 2 below re-asserts
--      the canonical objects from 20260303000000_create_memories_table.sql
--      (table, 3 enums, RLS + 5 policies, helper function, 8 core indexes,
--      the updated_at trigger, and the security-invoker health-stats view).
--      Encryption/quarantine-lane objects from that same original file are
--      NOT included here — AUDIT.md did not name them as missing, and
--      re-touching them without live evidence would be scope creep.
--
-- The `memories.user_id` FK index (idx_memories_user_id) is intentionally
-- NOT included here — it is its own migration,
-- 20260712024849_memory_user_fk_index.sql, matching production's separate
-- "Follow-up" history entry.
--
-- RFC-link: reconciliation of already-live security hardening; no new
--   architecture, no behavior change versus current production state.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Internal/worker RPC lockdown (idempotent reassertion of live state).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT * FROM (VALUES
      ('activate_client_subscription', 'p_user_id uuid, p_tier text, p_skills jsonb, p_stripe_customer_id text, p_stripe_subscription_id text, p_current_period_start timestamptz, p_current_period_end timestamptz'),
      ('dispatch_scheduled_workflows', ''),
      ('enforce_skill_entitlement', ''),
      ('increment_rate_limit', 'p_scope text, p_key text, p_bucket_start timestamptz, p_limit_count integer, p_expires_at timestamptz'),
      ('omnitrace_get_run_bundle', 'p_workflow_id text, p_user_id uuid'),
      ('omnitrace_insert_event', 'p_workflow_id text, p_event_key text, p_kind text, p_name text, p_latency_ms integer, p_data_redacted jsonb, p_data_hash text'),
      ('omnitrace_upsert_run', 'p_workflow_id text, p_trace_id text, p_user_id uuid, p_status text, p_input_redacted jsonb, p_output_redacted jsonb, p_input_hash text, p_output_hash text, p_event_count integer')
    ) AS t(proname, args)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = fn.proname
    ) THEN
-- additive-allow: REVOKE Security fix: internal worker/control RPC must not be callable by anon or authenticated (post-PR#1629 hardening reconciliation)
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', fn.proname, fn.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO postgres, service_role', fn.proname, fn.args);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Memory subsystem restoration (canonical objects from
--    20260303000000_create_memories_table.sql — idempotent reassertion).
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_type_enum') THEN
    CREATE TYPE public.memory_type_enum AS ENUM ('episodic', 'semantic', 'procedural', 'preference');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provenance_type_enum') THEN
    CREATE TYPE public.provenance_type_enum AS ENUM ('user_confirmed', 'tool_output', 'workflow_receipt', 'rag_synthesis', 'import');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_trust_enum') THEN
    CREATE TYPE public.device_trust_enum AS ENUM ('trusted', 'suspect', 'blocked', 'unknown');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_jwt_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $BODY$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid; -- NOSONAR
$BODY$;

CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
-- additive-allow: ON_DELETE_CASCADE Reconciliation: reproduces the already-live FK from 20260303000000_create_memories_table.sql unchanged; cascade delete on account closure is the original canonical design, not a new choice
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id UUID,
  device_trust_level public.device_trust_enum NOT NULL DEFAULT 'unknown',
  content TEXT NOT NULL,
  content_hash TEXT GENERATED ALWAYS AS (encode(sha256(content::bytea), 'hex')) STORED,
  embedding VECTOR(1536),
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  memory_type public.memory_type_enum NOT NULL DEFAULT 'episodic',
  source_tag TEXT NOT NULL DEFAULT 'omnihub',
  provenance_type public.provenance_type_enum NOT NULL DEFAULT 'tool_output',
  trust_score FLOAT NOT NULL DEFAULT 0.3 CHECK (trust_score >= 0 AND trust_score <= 1),
  is_quarantined BOOLEAN NOT NULL DEFAULT FALSE,
  content_encrypted BYTEA,
  encryption_key_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_memories_embedding
  ON public.memories USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_user ON public.memories(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_type ON public.memories(tenant_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_importance ON public.memories(tenant_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_created ON public.memories(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_user_type ON public.memories(tenant_id, user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_expires ON public.memories(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_provenance ON public.memories(provenance_type, trust_score);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- additive-allow: DROP_POLICY Reconciliation: CREATE POLICY has no IF NOT EXISTS in Postgres; drop-then-recreate is the standard idempotent pattern and reproduces the already-live policy unchanged
DROP POLICY IF EXISTS memories_user_select ON public.memories;
CREATE POLICY memories_user_select ON public.memories
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_jwt_tenant_id() AND user_id = auth.uid() AND NOT is_quarantined);

-- additive-allow: DROP_POLICY Reconciliation: CREATE POLICY has no IF NOT EXISTS in Postgres; drop-then-recreate is the standard idempotent pattern and reproduces the already-live policy unchanged
DROP POLICY IF EXISTS memories_user_insert ON public.memories;
CREATE POLICY memories_user_insert ON public.memories
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_jwt_tenant_id() AND user_id = auth.uid() AND device_trust_level IN ('trusted', 'suspect'));

-- additive-allow: DROP_POLICY Reconciliation: CREATE POLICY has no IF NOT EXISTS in Postgres; drop-then-recreate is the standard idempotent pattern and reproduces the already-live policy unchanged
DROP POLICY IF EXISTS memories_user_update ON public.memories;
CREATE POLICY memories_user_update ON public.memories
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_jwt_tenant_id() AND user_id = auth.uid())
  WITH CHECK (tenant_id = public.get_jwt_tenant_id() AND user_id = auth.uid());

-- additive-allow: DROP_POLICY Reconciliation: CREATE POLICY has no IF NOT EXISTS in Postgres; drop-then-recreate is the standard idempotent pattern and reproduces the already-live policy unchanged
DROP POLICY IF EXISTS memories_user_delete ON public.memories;
CREATE POLICY memories_user_delete ON public.memories
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_jwt_tenant_id() AND user_id = auth.uid());

-- additive-allow: DROP_POLICY Reconciliation: CREATE POLICY has no IF NOT EXISTS in Postgres; drop-then-recreate is the standard idempotent pattern and reproduces the already-live policy unchanged
DROP POLICY IF EXISTS memories_service_role ON public.memories;
CREATE POLICY memories_service_role ON public.memories
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'handle_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_memories_updated_at' AND tgrelid = 'public.memories'::regclass) THEN
    CREATE TRIGGER handle_memories_updated_at
      BEFORE UPDATE ON public.memories
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

CREATE OR REPLACE VIEW public.memory_health_stats
  WITH (security_invoker = true) AS
SELECT
  tenant_id,
  user_id,
  COUNT(*) AS total_memories,
  COUNT(*) FILTER (WHERE memory_type = 'episodic') AS episodic_count,
  COUNT(*) FILTER (WHERE memory_type = 'semantic') AS semantic_count,
  COUNT(*) FILTER (WHERE memory_type = 'procedural') AS procedural_count,
  COUNT(*) FILTER (WHERE memory_type = 'preference') AS preference_count,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS embedded_count,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW()) AS expired_count,
  COUNT(*) FILTER (WHERE embedding IS NULL AND embedding_model IS NOT NULL) AS pending_reembed_count,
  COUNT(*) FILTER (WHERE trust_score < 0.3 AND provenance_type != 'user_confirmed') AS poisoned_candidate_count,
  COUNT(*) FILTER (WHERE is_quarantined = true) AS quarantined_count,
  COALESCE(AVG(importance_score), 0) AS avg_importance,
  COALESCE(AVG(trust_score), 0) AS avg_trust_score,
  COALESCE(AVG(access_count), 0) AS avg_access_count,
  MAX(created_at) AS latest_memory_at,
  MIN(created_at) AS oldest_memory_at,
  embedding_model AS current_embedding_model
FROM public.memories
GROUP BY tenant_id, user_id, embedding_model;

GRANT SELECT ON public.memory_health_stats TO authenticated;
GRANT SELECT ON public.memory_health_stats TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories TO authenticated;
GRANT ALL ON public.memories TO service_role;

COMMIT;
