-- Migration: OmniLink Agentic RAG Infrastructure
-- Creates agent_skills table with vector search, RLS policies, and hybrid search RPC

-- Enable pgvector extension (use extensions schema if required by project standard)
CREATE EXTENSION IF NOT EXISTS vector;

-- agent_skills table for dynamic skill registry
CREATE TABLE IF NOT EXISTS public.agent_skills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    description text NOT NULL,
    tool_definition jsonb NOT NULL,
    embedding vector(384) NOT NULL,  -- gte-small dimension
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Full-text search support for hybrid search
ALTER TABLE public.agent_skills
ADD COLUMN IF NOT EXISTS fts tsvector
GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
) STORED;

-- HNSW index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS agent_skills_embedding_hnsw
ON public.agent_skills
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS agent_skills_fts_gin
ON public.agent_skills
USING gin (fts);

-- Enable Row Level Security
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read skills
CREATE POLICY "agent_skills_select_authenticated" ON public.agent_skills
FOR SELECT
TO authenticated
USING (true);

-- Allow service_role full access (for skill registration)
CREATE POLICY IF NOT EXISTS "agent_skills_all_service_role" ON public.agent_skills
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Note: match_skills RPC function is defined in 20251221000001_omnilink_ops_pack.sql
-- with full governance column support

-- agent_checkpoints table for thread state persistence
CREATE TABLE IF NOT EXISTS public.agent_checkpoints (
    thread_id text PRIMARY KEY,
    user_id uuid NOT NULL DEFAULT auth.uid(),
    state jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on checkpoints
ALTER TABLE public.agent_checkpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkpoints
-- Users can only access their own checkpoints
CREATE POLICY "agent_checkpoints_crud_own" ON public.agent_checkpoints
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role full access for checkpoints
CREATE POLICY IF NOT EXISTS "agent_checkpoints_all_service_role" ON public.agent_checkpoints
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Index for efficient user-based queries
CREATE INDEX IF NOT EXISTS agent_checkpoints_user_id_idx
ON public.agent_checkpoints (user_id);

-- Index for efficient thread-based queries
CREATE INDEX IF NOT EXISTS agent_checkpoints_thread_id_idx
ON public.agent_checkpoints (thread_id);
