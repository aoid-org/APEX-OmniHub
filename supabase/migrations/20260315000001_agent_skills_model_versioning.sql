-- Migration: Add embedding model versioning to agent_skills
-- Purpose: Prevent silent vector corruption on model upgrades.
--          All similarity searches MUST filter WHERE embedding_model = current_model.
-- Gap:     1.2 — No embedding_model column
-- Author:  APEX Engineering
-- Date:    2026-03-15

-- Add model tracking columns (idempotent)
ALTER TABLE public.agent_skills
  ADD COLUMN IF NOT EXISTS embedding_model TEXT NOT NULL
    DEFAULT 'gte-small',
  ADD COLUMN IF NOT EXISTS embedding_dim   INT  NOT NULL
    DEFAULT 384;

-- Index to allow fast per-model queries and detect cross-model contamination
CREATE INDEX IF NOT EXISTS idx_agent_skills_embedding_model
  ON public.agent_skills (embedding_model);

-- Update match_skills RPC to enforce model isolation
-- Replaces the function from 20251221000000_omnilink_agentic_rag.sql
CREATE OR REPLACE FUNCTION public.match_skills(
    query_embedding vector(384),
    query_text      text,
    match_threshold float DEFAULT 0.1,
    match_count     int   DEFAULT 5,
    p_model         text  DEFAULT 'gte-small'
)
RETURNS TABLE (
    id              uuid,
    name            text,
    description     text,
    tool_definition jsonb,
    metadata        jsonb,
    created_at      timestamptz,
    score           float
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
    WITH semantic_search AS (
        SELECT
            id, name, description, tool_definition, metadata, created_at,
            1 - (embedding <=> query_embedding) AS semantic_score
        FROM public.agent_skills
        WHERE embedding_model = p_model
          AND 1 - (embedding <=> query_embedding) >= match_threshold
        ORDER BY semantic_score DESC
        LIMIT match_count * 4
    ),
    keyword_search AS (
        SELECT
            id, name, description, tool_definition, metadata, created_at,
            ts_rank(fts, plainto_tsquery('english', query_text)) AS keyword_score
        FROM public.agent_skills
        WHERE embedding_model = p_model
          AND fts @@ plainto_tsquery('english', query_text)
        ORDER BY keyword_score DESC
        LIMIT match_count * 4
    ),
    combined AS (
        SELECT
            COALESCE(s.id, k.id)                       AS id,
            COALESCE(s.name, k.name)                   AS name,
            COALESCE(s.description, k.description)     AS description,
            COALESCE(s.tool_definition, k.tool_definition) AS tool_definition,
            COALESCE(s.metadata, k.metadata)           AS metadata,
            COALESCE(s.created_at, k.created_at)       AS created_at,
            CASE
                WHEN s.id IS NOT NULL AND k.id IS NOT NULL THEN
                    0.7 / (60 + ROW_NUMBER() OVER (ORDER BY s.semantic_score DESC)) +
                    0.3 / (60 + ROW_NUMBER() OVER (ORDER BY k.keyword_score DESC))
                WHEN s.id IS NOT NULL THEN
                    0.7 / (60 + ROW_NUMBER() OVER (ORDER BY s.semantic_score DESC))
                ELSE
                    0.3 / (60 + ROW_NUMBER() OVER (ORDER BY k.keyword_score DESC))
            END AS rrf_score
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.id = k.id
    )
    SELECT id, name, description, tool_definition, metadata, created_at,
           rrf_score AS score
    FROM combined
    ORDER BY rrf_score DESC
    LIMIT match_count;
$$;

COMMENT ON COLUMN public.agent_skills.embedding_model IS
  'Embedding model identifier (e.g. gte-small, text-embedding-3-small). '
  'CRITICAL: Never run similarity search across mixed models — vectors are incompatible.';
COMMENT ON COLUMN public.agent_skills.embedding_dim IS
  'Vector dimensionality. Must match the pgvector column size for this model.';
