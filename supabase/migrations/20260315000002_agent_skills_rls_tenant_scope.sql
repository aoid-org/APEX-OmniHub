-- Migration: Scope agent_skills RLS to owner
-- Purpose:   Current policy is USING (true) — every authenticated user
--            can read every skill embedding in the table. At multi-tenant
--            scale this is a data leakage event: Tenant A can read
--            Tenant B's proprietary tool definitions and embeddings.
-- Gap:       GAP-4 (agent_skills RLS global read exposure)
-- Author:    APEX Engineering
-- Date:      2026-03-15

-- Add owner_id column (nullable = system skill, visible to all)
ALTER TABLE public.agent_skills
    ADD COLUMN IF NOT EXISTS owner_id UUID
        REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_skills_owner_id
    ON public.agent_skills (owner_id)
    WHERE owner_id IS NOT NULL;

-- Drop the over-broad read policy
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'agent_skills'
          AND policyname = 'agent_skills_select_authenticated'
    ) THEN
        DROP POLICY agent_skills_select_authenticated
            ON public.agent_skills;
    END IF;
END $$;

-- Scoped policy: users see system skills (owner_id IS NULL)
-- plus their own skills
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'agent_skills'
          AND policyname = 'agent_skills_select_scoped'
    ) THEN
        CREATE POLICY "agent_skills_select_scoped"
            ON public.agent_skills
            FOR SELECT
            TO authenticated
            USING (owner_id IS NULL OR owner_id = auth.uid());
    END IF;
END $$;

COMMENT ON COLUMN public.agent_skills.owner_id IS
    'NULL = system skill visible to all authenticated users. '
    'Non-null = tenant-owned skill visible only to that user.';
