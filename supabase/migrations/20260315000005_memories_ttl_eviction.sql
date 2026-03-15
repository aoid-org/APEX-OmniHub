-- Migration: TTL eviction for agent_memories / acra_memories
-- Purpose: Without a scheduled DELETE, the vector table grows without bound.
--          At 1K embeddings/day * 100 tenants = OOM event within weeks.
-- Gap:     1.1
-- Author:  APEX Engineering
-- Date:    2026-03-15

-- This migration is safe to run even if the memories table does not yet exist
-- (the cron job will be a no-op until the table exists).

-- Ensure pg_cron extension is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create memories table if it doesn't exist yet
-- (aligns with the intended ACRA schema — embedding_model column included from Day 1)
CREATE TABLE IF NOT EXISTS public.agent_memories (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id      TEXT        NOT NULL,
    content         TEXT        NOT NULL,
    embedding       vector(384),
    embedding_model TEXT        NOT NULL DEFAULT 'gte-small',
    embedding_dim   INT         NOT NULL DEFAULT 384,
    metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id
  ON public.agent_memories (user_id);

CREATE INDEX IF NOT EXISTS idx_agent_memories_expires_at
  ON public.agent_memories (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding_model
  ON public.agent_memories (embedding_model);

CREATE POLICY "memories_owner_crud"
  ON public.agent_memories FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "memories_service_all"
  ON public.agent_memories FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding_hnsw
  ON public.agent_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Schedule nightly TTL eviction at 02:30 UTC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'agent-memories-ttl-eviction'
  ) THEN
    PERFORM cron.schedule(
      'agent-memories-ttl-eviction',
      '30 2 * * *',
      $$DELETE FROM public.agent_memories
        WHERE expires_at IS NOT NULL
          AND expires_at < NOW()$$
    );
    RAISE NOTICE 'pg_cron job "agent-memories-ttl-eviction" scheduled.';
  END IF;
END $$;

COMMENT ON TABLE public.agent_memories IS
  'ACRA agent memory store. expires_at enforced nightly by pg_cron. '
  'embedding_model column prevents cross-model vector contamination.';
