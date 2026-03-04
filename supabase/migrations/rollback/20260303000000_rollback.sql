-- ================================================================
-- ROLLBACK: 20260303000000_create_memories_table.sql
-- DROP ORDER: views → functions → table → types → extension
-- ================================================================

-- Views
DROP VIEW IF EXISTS public.quarantined_memories;
DROP VIEW IF EXISTS public.memory_health_stats;

-- Round 3: Encrypt-at-rest functions
DROP FUNCTION IF EXISTS public.decrypt_memory_content(UUID, TEXT);
DROP FUNCTION IF EXISTS public.encrypt_memory_content(UUID, TEXT, TEXT);

-- Round 3: Quarantine functions
DROP FUNCTION IF EXISTS public.unquarantine_memory(UUID);
DROP FUNCTION IF EXISTS public.quarantine_memory(UUID, TEXT);

-- P1: Batch re-embed functions
DROP FUNCTION IF EXISTS public.apply_reembedding(UUID, VECTOR, TEXT);
DROP FUNCTION IF EXISTS public.batch_reembed_candidates(INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.set_ef_search(INTEGER);

-- P0: Data subject operations
DROP FUNCTION IF EXISTS public.purge_user_memories(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.export_user_memories(UUID, UUID);

-- P0: Observability RPC
DROP FUNCTION IF EXISTS public.fetch_tenant_memory_health(UUID);

-- P0: Anti-poisoning
DROP FUNCTION IF EXISTS public.promote_memory(UUID, public.memory_type_enum, FLOAT);

-- Core: Lifecycle functions
DROP FUNCTION IF EXISTS public.mark_stale_embeddings(TEXT);
DROP FUNCTION IF EXISTS public.apply_memory_ttl_policy();
DROP FUNCTION IF EXISTS public.touch_memory(UUID);
DROP FUNCTION IF EXISTS public.cleanup_expired_memories();

-- Trigger function
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- Table (cascades indexes, triggers, policies)
DROP TABLE IF EXISTS public.memories CASCADE;

-- ENUMs (must come AFTER table drop)
DROP TYPE IF EXISTS public.device_trust_enum;
DROP TYPE IF EXISTS public.provenance_type_enum;
DROP TYPE IF EXISTS public.memory_type_enum;

-- Extension (only if no other objects depend on it)
-- DROP EXTENSION IF EXISTS pgcrypto;
