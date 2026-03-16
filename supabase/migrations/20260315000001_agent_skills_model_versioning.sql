-- Migration: Add embedding model versioning to agent_skills
-- Purpose:   The original agent_skills table has a vector(384) column
--            but no record of which embedding model produced it.
--            When migrating from gte-small to a different model,
--            cosine similarity breaks silently because old and new
--            vectors live in the same table with incompatible geometry.
--            This is a data corruption event, not a bug.
-- Gap:       GAP-4 (embedding_model column absent from original schema)
-- Author:    APEX Engineering
-- Date:      2026-03-15

-- Add model tracking columns (idempotent via IF NOT EXISTS)
ALTER TABLE public.agent_skills
    ADD COLUMN IF NOT EXISTS embedding_model TEXT
        NOT NULL DEFAULT 'gte-small',
    ADD COLUMN IF NOT EXISTS embedding_dim   INT
        NOT NULL DEFAULT 384;

-- Per-model index enables fast scoped similarity queries
-- and lets ops verify no cross-model contamination exists
CREATE INDEX IF NOT EXISTS idx_agent_skills_embedding_model
    ON public.agent_skills (embedding_model);

-- Replace match_skills RPC to enforce model isolation.
-- All callers must pass p_model — no cross-model queries possible.
CREATE OR REPLACE FUNCTION public.match_skills(
    query_embedding vector(384),
    query_text      text,
    match_threshold float DEFAULT 0.1,
    match_count     int   DEFAULT 5,
    p_model         text  DEFAULT 'gte-small'
) RETURNS TABLE (
    id              uuid,
    name            text,
    description     text,
    tool_definition jsonb,
    metadata        jsonb,
    created_at      timestamptz,
    score           float
) LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$
    WITH semantic_search AS (
        SELECT
            id,
            name,
            description,
            tool_definition,
            metadata,
            created_at,
            1 - (embedding <=> query_embedding) AS semantic_score
        FROM public.agent_skills
        WHERE embedding_model = p_model
          AND 1 - (embedding <=> query_embedding) >= match_threshold
        ORDER BY semantic_score DESC
        LIMIT match_count * 4
    ),
    keyword_search AS (
        SELECT
            id,
            name,
            description,
            tool_definition,
            metadata,
            created_at,
            ts_rank(fts, plainto_tsquery('english', query_text))
                AS keyword_score
        FROM public.agent_skills
        WHERE embedding_model = p_model
          AND fts @@ plainto_tsquery('english', query_text)
        ORDER BY keyword_score DESC
        LIMIT match_count * 4
    ),
    combined AS (
        SELECT
            COALESCE(s.id, k.id)                           AS id,
            COALESCE(s.name, k.name)                       AS name,
            COALESCE(s.description, k.description)         AS description,
            COALESCE(s.tool_definition, k.tool_definition) AS tool_definition,
            COALESCE(s.metadata, k.metadata)               AS metadata,
            COALESCE(s.created_at, k.created_at)           AS created_at,
            CASE
                WHEN s.id IS NOT NULL AND k.id IS NOT NULL THEN
                    0.7 / (60 + ROW_NUMBER()
                        OVER (ORDER BY s.semantic_score DESC))
                    + 0.3 / (60 + ROW_NUMBER()
                        OVER (ORDER BY k.keyword_score DESC))
                WHEN s.id IS NOT NULL THEN
                    0.7 / (60 + ROW_NUMBER()
                        OVER (ORDER BY s.semantic_score DESC))
                ELSE
                    0.3 / (60 + ROW_NUMBER()
                        OVER (ORDER BY k.keyword_score DESC))
            END AS rrf_score
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.id = k.id
    )
    SELECT
        id,
        name,
        description,
        tool_definition,
        metadata,
        created_at,
        rrf_score AS score
    FROM combined
    ORDER BY rrf_score DESC
    LIMIT match_count;
$$;

COMMENT ON COLUMN public.agent_skills.embedding_model IS
    'Embedding model identifier (e.g. gte-small, text-embedding-3-small). '
    'CRITICAL: Never run similarity search across mixed models — '
    'vectors with different models are geometrically incompatible.';

COMMENT ON COLUMN public.agent_skills.embedding_dim IS
    'Vector dimensionality. Must match the pgvector column size '
    'declared for this model.';
