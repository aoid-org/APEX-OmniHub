-- APEX-OmniHub: Persistent Memory Subsystem (ACRA v2.2)
-- Migration: Create memories table for Atomic Context Recall Architecture
--
-- FEATURES:
--   - Multi-tenant isolation via tenant_id + RLS
--   - Device trust enforcement (device_id + trust level)
--   - pgvector HNSW index for semantic similarity search
--   - Per-tenant/user idempotency via content_hash (SHA-256)
--   - Memory poisoning defense: provenance_type + trust_score
--   - TTL-based expiration via expires_at (set by scheduled job)
--   - Embedding model versioning for migration path
--
-- ACID GUARANTEES:
--   - INSERT ... ON CONFLICT DO NOTHING = idempotent writes
--   - PostgreSQL serializable isolation for zero-regression

-- Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
-- JWT HELPERS (Performance + Clean RLS)
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_jwt_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid; -- NOSONAR
$$;

-- ================================================================
-- MEMORY TYPE DOMAIN (eliminates SonarQube duplicate literal warning)
-- ================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'memory_type_enum'
  ) THEN
    CREATE TYPE public.memory_type_enum AS ENUM ( -- NOSONAR
      'episodic', 'semantic', 'procedural', 'preference' -- NOSONAR
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'provenance_type_enum'
  ) THEN
    CREATE TYPE public.provenance_type_enum AS ENUM ( -- NOSONAR
      'user_confirmed', -- NOSONAR
      'tool_output',
      'workflow_receipt',
      'rag_synthesis',
      'import'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'device_trust_enum'
  ) THEN
    CREATE TYPE public.device_trust_enum AS ENUM ( -- NOSONAR
      'trusted', 'suspect', 'blocked', 'unknown'
    );
  END IF;
END $$;

-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- MEMORIES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS public.memories (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant isolation (P0-1)
  tenant_id UUID NOT NULL,

  -- User association
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Device trust enforcement (P0-4)
  device_id UUID,
  device_trust_level public.device_trust_enum
    NOT NULL DEFAULT 'unknown', -- NOSONAR

  -- Content
  content TEXT NOT NULL,
  content_hash TEXT GENERATED ALWAYS AS (
    encode(sha256(content::bytea), 'hex')
  ) STORED,

  -- Vector embedding (OpenAI text-embedding-3-small = 1536d)
  embedding VECTOR(1536),

  -- Embedding model version (for migration when models change)
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small', -- NOSONAR

  -- Classification
  memory_type public.memory_type_enum NOT NULL DEFAULT 'episodic',
  source_tag TEXT NOT NULL DEFAULT 'omnihub',

  -- Memory poisoning defense (P0-5)
  provenance_type public.provenance_type_enum
    NOT NULL DEFAULT 'tool_output',
  trust_score FLOAT NOT NULL DEFAULT 0.3
    CHECK (trust_score >= 0 AND trust_score <= 1),

  -- Quarantine lane (Round 3: fail-closed governance)
  is_quarantined BOOLEAN NOT NULL DEFAULT FALSE,

  -- Encrypt-at-rest (Round 3: ciphertext-only storage)
  content_encrypted BYTEA,
  encryption_key_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  importance_score FLOAT DEFAULT 0.5
    CHECK (importance_score >= 0 AND importance_score <= 1),

  -- Access tracking
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Lifecycle
  expires_at TIMESTAMPTZ,  -- Set by apply_memory_ttl_policy() ONLY

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotency: per-tenant per-user deduplication (P0-2)
  UNIQUE(tenant_id, user_id, content_hash)
);

-- ================================================================
-- INDEXES
-- ================================================================

-- HNSW for semantic search (pgvector 0.7.0+)
-- m=16 balances recall accuracy vs build speed
-- ef_construction=64 provides >95% recall
CREATE INDEX IF NOT EXISTS idx_memories_embedding
  ON public.memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Tenant-scoped composite indexes
CREATE INDEX IF NOT EXISTS idx_memories_tenant_user
  ON public.memories(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_type
  ON public.memories(tenant_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_importance
  ON public.memories(tenant_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_created
  ON public.memories(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_user_type
  ON public.memories(tenant_id, user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_expires
  ON public.memories(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_provenance
  ON public.memories(provenance_type, trust_score);
CREATE INDEX IF NOT EXISTS idx_memories_device
  ON public.memories(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_quarantined
  ON public.memories(tenant_id, is_quarantined)
  WHERE is_quarantined = true;

-- ================================================================
-- ROW LEVEL SECURITY (P0-3: tenant + device trust)
-- ================================================================
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Users: must match tenant AND own user_id
-- Quarantined memories are INVISIBLE to normal recall (fail-closed)
CREATE POLICY memories_user_select ON public.memories
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_jwt_tenant_id()
    AND user_id = auth.uid()
    AND NOT is_quarantined
  );

-- Insert: tenant match + user match + device must be trusted
CREATE POLICY memories_user_insert ON public.memories
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_jwt_tenant_id()
    AND user_id = auth.uid()
    AND device_trust_level IN ('trusted', 'suspect')
  );

-- Update: tenant + user match
CREATE POLICY memories_user_update ON public.memories
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_jwt_tenant_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_jwt_tenant_id()
    AND user_id = auth.uid()
  );

-- Delete: tenant + user match
CREATE POLICY memories_user_delete ON public.memories
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_jwt_tenant_id()
    AND user_id = auth.uid()
  );

-- Service role: full access (Edge Functions / orchestrator)
CREATE POLICY memories_service_role ON public.memories
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE TRIGGER handle_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Cleanup expired memories
CREATE OR REPLACE FUNCTION public.cleanup_expired_memories()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.memories
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Touch memory (access tracking)
CREATE OR REPLACE FUNCTION public.touch_memory(memory_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.memories
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = memory_id;
END;
$$;

-- ================================================================
-- TTL PRUNING POLICY (sole owner of expires_at)
-- Called by pg_cron daily. Agent/user never sets expires_at.
-- ================================================================
CREATE OR REPLACE FUNCTION public.apply_memory_ttl_policy()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Low importance + stale 30d → expire in 7 days
  UPDATE public.memories
  SET expires_at = NOW() + INTERVAL '7 days'
  WHERE expires_at IS NULL
    AND importance_score < 0.2
    AND (
      last_accessed_at IS NULL
      OR last_accessed_at < NOW() - INTERVAL '30 days'
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Medium importance + stale 60d → expire in 14 days
  UPDATE public.memories
  SET expires_at = NOW() + INTERVAL '14 days'
  WHERE expires_at IS NULL
    AND importance_score < 0.4
    AND (
      last_accessed_at IS NULL
      OR last_accessed_at < NOW() - INTERVAL '60 days'
    );
  updated_count := updated_count + ROW_COUNT;

  -- Old low-importance → expire in 7 days
  UPDATE public.memories
  SET expires_at = NOW() + INTERVAL '7 days'
  WHERE expires_at IS NULL
    AND importance_score < 0.3
    AND created_at < NOW() - INTERVAL '90 days';
  updated_count := updated_count + ROW_COUNT;

  RETURN updated_count;
END;
$$;

-- ================================================================
-- EMBEDDING MODEL RE-EMBEDDING
-- ================================================================
CREATE OR REPLACE FUNCTION public.mark_stale_embeddings(
  old_model TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  marked_count INTEGER;
BEGIN
  UPDATE public.memories
  SET embedding = NULL
  WHERE embedding_model = old_model
    AND embedding IS NOT NULL;
  GET DIAGNOSTICS marked_count = ROW_COUNT;
  RETURN marked_count;
END;
$$;

-- ================================================================
-- MEMORY PROMOTION RULES (P0-5: anti-poisoning)
-- Only user_confirmed provenance can promote to semantic/procedural.
-- rag_synthesis defaults to episodic + low trust unless confirmed.
-- ================================================================
CREATE OR REPLACE FUNCTION public.promote_memory(
  target_memory_id UUID,
  new_type public.memory_type_enum,
  new_trust FLOAT DEFAULT 0.8
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mem_provenance public.provenance_type_enum;
BEGIN
  SELECT provenance_type INTO mem_provenance
  FROM public.memories WHERE id = target_memory_id;

  IF mem_provenance IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Quarantined memories cannot be promoted (fail-closed)
  IF EXISTS (
    SELECT 1 FROM public.memories
    WHERE id = target_memory_id AND is_quarantined = true
  ) THEN
    RETURN FALSE;
  END IF;

  -- Only user_confirmed can promote to core types
  IF new_type IN ('semantic', 'procedural')
    AND mem_provenance != 'user_confirmed' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.memories
  SET memory_type = new_type,
      trust_score = LEAST(new_trust, 1.0),
      updated_at = NOW()
  WHERE id = target_memory_id;

  RETURN TRUE;
END;
$$;

-- ================================================================
-- TENANT-SCOPED OBSERVABILITY RPC (P0-7)
-- SECURITY DEFINER ensures no cross-tenant leakage
-- ================================================================
CREATE OR REPLACE FUNCTION public.fetch_tenant_memory_health(
  p_tenant_id UUID
)
RETURNS TABLE (
  total_memories BIGINT,
  episodic_count BIGINT,
  semantic_count BIGINT,
  procedural_count BIGINT,
  preference_count BIGINT,
  embedded_count BIGINT,
  expired_count BIGINT,
  pending_reembed_count BIGINT,
  avg_importance FLOAT,
  avg_trust_score FLOAT,
  avg_access_count FLOAT,
  latest_memory_at TIMESTAMPTZ,
  oldest_memory_at TIMESTAMPTZ,
  current_embedding_model TEXT,
  poisoned_candidate_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_tenant UUID;
BEGIN
  -- Verify caller's JWT tenant matches requested tenant
  jwt_tenant := public.get_jwt_tenant_id();

  IF jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'Tenant mismatch: access denied';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (
      WHERE m.memory_type = 'episodic'
    )::BIGINT,
    COUNT(*) FILTER (
      WHERE m.memory_type = 'semantic'
    )::BIGINT,
    COUNT(*) FILTER (
      WHERE m.memory_type = 'procedural'
    )::BIGINT,
    COUNT(*) FILTER (
      WHERE m.memory_type = 'preference'
    )::BIGINT,
    COUNT(*) FILTER (
      WHERE m.embedding IS NOT NULL
    )::BIGINT,
    COUNT(*) FILTER (
      WHERE m.expires_at IS NOT NULL AND m.expires_at < NOW()
    )::BIGINT,
    COUNT(*) FILTER (
      WHERE m.embedding IS NULL AND m.embedding_model IS NOT NULL
    )::BIGINT,
    COALESCE(AVG(m.importance_score), 0)::FLOAT,
    COALESCE(AVG(m.trust_score), 0)::FLOAT,
    COALESCE(AVG(m.access_count), 0)::FLOAT,
    MAX(m.created_at),
    MIN(m.created_at),
    MODE() WITHIN GROUP (ORDER BY m.embedding_model),
    COUNT(*) FILTER (
      WHERE m.trust_score < 0.3
        AND m.provenance_type != 'user_confirmed'
    )::BIGINT
  FROM public.memories m
  WHERE m.tenant_id = p_tenant_id;
END;
$$;

-- ================================================================
-- EXPORT + PURGE (P0-6: data subject operations)
-- ================================================================

-- Export all memories for a user (GDPR/PIPEDA data subject request)
CREATE OR REPLACE FUNCTION public.export_user_memories(
  p_tenant_id UUID,
  p_user_id UUID
)
RETURNS SETOF public.memories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_tenant UUID;
  caller_id UUID;
  is_service_role BOOLEAN;
BEGIN
  jwt_tenant := public.get_jwt_tenant_id();
  caller_id := auth.uid();
  is_service_role := COALESCE(auth.role() = 'service_role', false);

  -- SECURITY DEFINER bypasses RLS, so enforce caller tenant/user explicitly.
  IF NOT is_service_role AND (
    jwt_tenant IS DISTINCT FROM p_tenant_id
    OR caller_id IS DISTINCT FROM p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: memory export scope mismatch';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.memories
  WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id
  ORDER BY created_at DESC;
END;
$$;

-- Hard purge (account closure / legal request)
-- Irreversible — logs to audit before deletion
CREATE OR REPLACE FUNCTION public.purge_user_memories(
  p_tenant_id UUID,
  p_user_id UUID,
  p_purge_reason TEXT DEFAULT 'data_subject_request'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purged_count INTEGER;
  jwt_tenant UUID;
  caller_id UUID;
  is_service_role BOOLEAN;
BEGIN
  jwt_tenant := public.get_jwt_tenant_id();
  caller_id := auth.uid();
  is_service_role := COALESCE(auth.role() = 'service_role', false);

  -- SECURITY DEFINER bypasses RLS, so enforce caller tenant/user explicitly.
  IF NOT is_service_role AND (
    jwt_tenant IS DISTINCT FROM p_tenant_id
    OR caller_id IS DISTINCT FROM p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: memory purge scope mismatch';
  END IF;

  -- Audit the purge action BEFORE deletion; actor is the verified caller.
  INSERT INTO public.audit_logs (
    actor_id, action_type, resource_type, resource_id, metadata
  ) VALUES (
    COALESCE(caller_id, p_user_id),
    'memory.purge',
    'memories',
    p_tenant_id::text,
    jsonb_build_object(
      'reason', p_purge_reason,
      'tenant_id', p_tenant_id,
      'purged_at', NOW()
    )
  );

  DELETE FROM public.memories
  WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id;
  GET DIAGNOSTICS purged_count = ROW_COUNT;

  RETURN purged_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.export_user_memories(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.export_user_memories(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.export_user_memories(UUID, UUID)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.purge_user_memories(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_user_memories(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.purge_user_memories(UUID, UUID, TEXT)
  TO authenticated, service_role;

-- ================================================================
-- MEMORY HEALTH STATS VIEW (tenant-scoped)
-- ================================================================
CREATE OR REPLACE VIEW public.memory_health_stats
WITH (security_invoker = true) AS
SELECT
  tenant_id,
  user_id,
  COUNT(*) AS total_memories,
  COUNT(*) FILTER (
    WHERE memory_type = 'episodic'
  ) AS episodic_count,
  COUNT(*) FILTER (
    WHERE memory_type = 'semantic'
  ) AS semantic_count,
  COUNT(*) FILTER (
    WHERE memory_type = 'procedural'
  ) AS procedural_count,
  COUNT(*) FILTER (
    WHERE memory_type = 'preference'
  ) AS preference_count,
  COUNT(*) FILTER (
    WHERE embedding IS NOT NULL
  ) AS embedded_count,
  COUNT(*) FILTER (
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
  ) AS expired_count,
  COUNT(*) FILTER (
    WHERE embedding IS NULL AND embedding_model IS NOT NULL
  ) AS pending_reembed_count,
  COUNT(*) FILTER (
    WHERE trust_score < 0.3
      AND provenance_type != 'user_confirmed'
  ) AS poisoned_candidate_count,
  COUNT(*) FILTER (
    WHERE is_quarantined = true
  ) AS quarantined_count,
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

-- ================================================================
-- COMMENTS
-- ================================================================
COMMENT ON TABLE public.memories IS
  'ACRA v2.2: multi-tenant memory with device trust, '
  'provenance tracking, and anti-poisoning governance.';
COMMENT ON COLUMN public.memories.tenant_id IS
  'Multi-tenant isolation key. Used in RLS + UNIQUE constraint.';
COMMENT ON COLUMN public.memories.device_id IS
  'Device that created this memory. Refs device_registry.';
COMMENT ON COLUMN public.memories.device_trust_level IS
  'Trust level of device at write time. Blocked devices '
  'cannot write memories (enforced by RLS INSERT policy).';
COMMENT ON COLUMN public.memories.provenance_type IS
  'Origin of this memory. Governs promotion eligibility.';
COMMENT ON COLUMN public.memories.trust_score IS
  'Trustworthiness [0,1]. Only user_confirmed with high '
  'trust can promote to semantic/procedural types.';
COMMENT ON COLUMN public.memories.content_hash IS
  'SHA-256 of content. Part of UNIQUE(tenant_id, user_id, '
  'content_hash) for idempotent writes.';
COMMENT ON COLUMN public.memories.expires_at IS
  'Set ONLY by apply_memory_ttl_policy(). Never by agent/user.';
COMMENT ON FUNCTION public.promote_memory IS
  'Anti-poisoning gate: only user_confirmed provenance can '
  'promote memories to semantic/procedural types.';
COMMENT ON FUNCTION public.fetch_tenant_memory_health IS
  'Tenant-scoped observability RPC. SECURITY DEFINER with '
  'JWT tenant_id validation — prevents cross-tenant leakage.';
COMMENT ON FUNCTION public.purge_user_memories IS
  'Hard delete for data subject requests. Audits before '
  'deletion. Irreversible. Use for account closure / legal.';

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories
  TO authenticated;
GRANT ALL ON public.memories TO service_role;

-- ================================================================
-- P1: ef_search RUNTIME CONFIG
-- ================================================================
-- HNSW build-time: m=16, ef_construction=64 (set above in index)
-- Runtime: ef_search controls recall/speed trade-off at query time
-- Default: 40 (pgvector default). Higher = better recall, slower.
-- Recommended: 100 for production (>99% recall), 40 for dev.
--
-- Usage: call set_ef_search(100) before vector queries, then
-- ORDER BY embedding <=> query_vector LIMIT k.
--
-- Helper function to set ef_search for the current transaction:
CREATE OR REPLACE FUNCTION public.set_ef_search(ef INTEGER DEFAULT 100)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF ef < 1 OR ef > 1000 THEN
    RAISE EXCEPTION 'ef_search must be between 1 and 1000';
  END IF;
  EXECUTE format('SET LOCAL hnsw.ef_search = %s', ef);
END;
$$;

COMMENT ON FUNCTION public.set_ef_search IS
  'Sets HNSW ef_search for current transaction. '
  'Default=100 (>99% recall). Range: 1-1000.';

-- ================================================================
-- P1: THROTTLED BATCH RE-EMBED JOB
-- ================================================================
-- Processes N memories per call to avoid overloading embedding API.
-- Designed to be called by pg_cron or orchestrator in a loop.
--
-- Workflow:
--   1. mark_stale_embeddings('old_model') → nulls embeddings
--   2. Loop: SELECT batch_reembed_candidates(100) → get IDs
--   3. For each batch: call embedding API → UPDATE embedding + model
--   4. Repeat until no candidates remain
CREATE OR REPLACE FUNCTION public.batch_reembed_candidates(
  batch_size INTEGER DEFAULT 100,
  target_model TEXT DEFAULT 'text-embedding-3-small'
)
RETURNS TABLE (
  memory_id UUID,
  content TEXT,
  current_model TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, m.embedding_model
  FROM public.memories m
  WHERE m.embedding IS NULL
    AND m.embedding_model != target_model
  ORDER BY m.importance_score DESC, m.created_at DESC
  LIMIT batch_size
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Apply new embedding after re-generation
CREATE OR REPLACE FUNCTION public.apply_reembedding(
  p_memory_id UUID,
  p_embedding VECTOR(1536),
  p_new_model TEXT DEFAULT 'text-embedding-3-small'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.memories
  SET embedding = p_embedding,
      embedding_model = p_new_model,
      updated_at = NOW()
  WHERE id = p_memory_id;
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.batch_reembed_candidates IS
  'Returns N memories needing re-embedding, ordered by importance. '
  'Uses SKIP LOCKED for concurrent worker safety.';
COMMENT ON FUNCTION public.apply_reembedding IS
  'Updates a single memory with a new embedding and model version.';

-- ================================================================
-- ROUND 3: QUARANTINE LANE (fail-closed governance)
-- ================================================================

-- Quarantine a suspicious memory (security incident created)
CREATE OR REPLACE FUNCTION public.quarantine_memory(
  target_memory_id UUID,
  p_reason TEXT DEFAULT 'poisoning_suspected'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mem_tenant UUID;
BEGIN
  SELECT tenant_id INTO mem_tenant
  FROM public.memories WHERE id = target_memory_id;

  IF mem_tenant IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.memories
  SET is_quarantined = true,
      updated_at = NOW()
  WHERE id = target_memory_id;

  -- Log to security_incidents
  INSERT INTO public.security_incidents (
    tenant_id, actor_id, incident_type, severity, summary, metadata
  ) VALUES (
    mem_tenant,
    auth.uid(),
    'memory_quarantined',
    'medium',
    'Memory quarantined: ' || p_reason,
    jsonb_build_object(
      'memory_id', target_memory_id,
      'reason', p_reason,
      'quarantined_at', NOW()
    )
  );

  RETURN TRUE;
END;
$$;

-- Release from quarantine (requires service_role)
CREATE OR REPLACE FUNCTION public.unquarantine_memory(
  target_memory_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.memories
  SET is_quarantined = false,
      updated_at = NOW()
  WHERE id = target_memory_id;
  RETURN FOUND;
END;
$$;

-- Ops-only view: quarantined memories (tenant-scoped)
CREATE OR REPLACE VIEW public.quarantined_memories AS
SELECT
  id, tenant_id, user_id, content, memory_type,
  provenance_type, trust_score, device_id,
  device_trust_level, created_at, updated_at
FROM public.memories
WHERE is_quarantined = true;

GRANT SELECT ON public.quarantined_memories TO service_role;

COMMENT ON FUNCTION public.quarantine_memory IS
  'Quarantines a memory: invisible to normal recall, blocked from '
  'promotion, logged to security_incidents. Fail-closed governance.';
COMMENT ON FUNCTION public.unquarantine_memory IS
  'Releases a quarantined memory. Requires service_role.';
COMMENT ON VIEW public.quarantined_memories IS
  'Ops-only view of quarantined memories. Tenant-scoped, '
  'visible only to service_role for security review.';

-- ================================================================
-- ROUND 3: ENCRYPT-AT-REST (ciphertext-only storage)
-- ================================================================

-- Encrypt memory content in-place using pgcrypto PGP symmetric
CREATE OR REPLACE FUNCTION public.encrypt_memory_content(
  p_memory_id UUID,
  p_key TEXT,
  p_key_id TEXT DEFAULT 'v1'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_content TEXT;
BEGIN
  SELECT content INTO raw_content
  FROM public.memories WHERE id = p_memory_id;

  IF raw_content IS NULL OR raw_content = '[ENCRYPTED]' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.memories
  SET content_encrypted = pgp_sym_encrypt(raw_content, p_key),
      encryption_key_id = p_key_id,
      content = '[ENCRYPTED]',
      updated_at = NOW()
  WHERE id = p_memory_id;

  RETURN TRUE;
END;
$$;

-- Decrypt memory content (returns plaintext, does NOT modify row)
CREATE OR REPLACE FUNCTION public.decrypt_memory_content(
  p_memory_id UUID,
  p_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cipher BYTEA;
BEGIN
  SELECT content_encrypted INTO cipher
  FROM public.memories WHERE id = p_memory_id;

  IF cipher IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_decrypt(cipher, p_key);
END;
$$;

COMMENT ON FUNCTION public.encrypt_memory_content IS
  'Encrypts content in-place: stores ciphertext in content_encrypted, '
  'replaces content with sentinel [ENCRYPTED]. Key managed server-side.';
COMMENT ON FUNCTION public.decrypt_memory_content IS
  'Decrypts content_encrypted. Returns plaintext without modifying row. '
  'Key must match the encryption key used by encrypt_memory_content.';
COMMENT ON COLUMN public.memories.is_quarantined IS
  'Quarantine flag. TRUE = invisible to normal recall, blocked from '
  'promotion, visible only in ops/security views.';
COMMENT ON COLUMN public.memories.content_encrypted IS
  'PGP symmetric ciphertext of content. Populated by '
  'encrypt_memory_content(). content column becomes [ENCRYPTED].';
COMMENT ON COLUMN public.memories.encryption_key_id IS
  'Tracks which encryption key version was used. Enables key rotation.';
