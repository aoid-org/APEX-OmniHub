-- Migration: ACRA agent_memories table + TTL eviction via pg_cron
-- Purpose:   Without scheduled deletion, the vector store grows without
--            bound. At 1K embeddings/day x 100 tenants the table
--            reaches OOM territory within weeks on shared Supabase.
--            Also creates the table with embedding_model from Day 1
--            to prevent the vector corruption pattern.
-- Gap:       GAP-4 (no TTL eviction, no memories table with model col)
-- Author:    APEX Engineering
-- Date:      2026-03-15

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS vector;

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

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'agent_memories'
          AND policyname = 'memories_owner_crud'
    ) THEN
        CREATE POLICY "memories_owner_crud"
            ON public.agent_memories FOR ALL TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'agent_memories'
          AND policyname = 'memories_service_all'
    ) THEN
        CREATE POLICY "memories_service_all"
            ON public.agent_memories FOR ALL TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id
    ON public.agent_memories (user_id);

CREATE INDEX IF NOT EXISTS idx_agent_memories_expires_at
    ON public.agent_memories (expires_at)
    WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_memories_model
    ON public.agent_memories (embedding_model);

CREATE INDEX IF NOT EXISTS idx_agent_memories_hnsw
    ON public.agent_memories
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Schedule nightly TTL eviction at 02:30 UTC
DO $do$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM cron.job
        WHERE jobname = 'agent-memories-ttl-eviction'
    ) THEN
        PERFORM cron.schedule(
            'agent-memories-ttl-eviction',
            '30 2 * * *',
            $$
            DELETE FROM public.agent_memories
            WHERE expires_at IS NOT NULL
              AND expires_at < NOW();
            $$
        );
        RAISE NOTICE 'pg_cron job agent-memories-ttl-eviction scheduled.';
    END IF;
END $do$;

COMMENT ON TABLE public.agent_memories IS
    'ACRA agent memory store. expires_at enforced nightly by pg_cron. '
    'embedding_model column prevents cross-model vector contamination.';
