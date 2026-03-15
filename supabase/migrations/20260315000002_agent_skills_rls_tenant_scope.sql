-- Migration: Scope agent_skills RLS to owner/tenant
-- Purpose: Current policy USING(true) exposes all skill embeddings to all
--          authenticated users — multi-tenant data leakage.
-- Gap:     NEW-4
-- Author:  APEX Engineering
-- Date:    2026-03-15

-- Add owner_id column for multi-tenant scoping (nullable = system skills visible to all)
ALTER TABLE public.agent_skills
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for efficient per-owner queries
CREATE INDEX IF NOT EXISTS idx_agent_skills_owner_id
  ON public.agent_skills (owner_id)
  WHERE owner_id IS NOT NULL;

-- Drop existing broad policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'agent_skills'
      AND policyname  = 'agent_skills_select_authenticated'
  ) THEN
    DROP POLICY agent_skills_select_authenticated ON public.agent_skills;
  END IF;
END $$;

-- Re-create policy: users see system skills (owner_id IS NULL) + their own skills
CREATE POLICY "agent_skills_select_scoped"
  ON public.agent_skills
  FOR SELECT
  TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());

-- Service role retains full access (via ensure_service_role_policy defined in 20251221)
SELECT public.ensure_service_role_policy('agent_skills');

COMMENT ON COLUMN public.agent_skills.owner_id IS
  'NULL = system skill (visible to all authenticated users). '
  'Non-null = tenant-owned skill, visible only to that user.';
