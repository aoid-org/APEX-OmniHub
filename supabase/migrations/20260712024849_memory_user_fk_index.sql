-- =============================================================================
-- memory_user_fk_index — RECONCILIATION FILE (2026-07-12)
-- =============================================================================
-- HONESTY NOTE: applied directly to production as a "Follow-up" fix during the
-- PR #1629 remediation session (2026-07-10/11) after
-- post_pr1629_release_hardening restored public.memories. Production's
-- supabase_migrations.schema_migrations already has a row for version
-- 20260712024849 / name "memory_user_fk_index" — this file reconciles local
-- migrations with that already-applied state so `supabase db push` stops
-- reporting drift. Confirmed live 2026-07-12: this exact index already exists.
--
-- public.memories.user_id references auth.users(id) ON DELETE CASCADE
-- (20260303000000_create_memories_table.sql) but had no covering index for
-- that FK — every cascade delete on auth.users would force a full table scan
-- of memories. This index closes that gap.
--
-- RFC-link: reconciliation of an already-live, additive-only index; no new
--   architecture, no behavior change versus current production state.
-- =============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_memories_user_id
  ON public.memories(user_id);

COMMIT;
