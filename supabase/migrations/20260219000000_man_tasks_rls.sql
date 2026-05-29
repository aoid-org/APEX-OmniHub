-- =============================================================================
-- AUDIT NOTE:
-- CHANGED: Replaced USING (true) on operator_role SELECT/UPDATE policies with
--   scoped predicates enforcing least-privilege access on man_tasks.
-- WHY: USING (true) granted unrestricted cross-tenant read/write — critical
--   data leak. Operators now see only PENDING tasks and can only update tasks
--   they are deciding on (decided_by bound to auth.uid()).
-- DATE: 2026-05-05
-- =============================================================================

-- Ensure RLS is enabled (idempotent — no-op if already enabled)
ALTER TABLE public.man_tasks ENABLE ROW LEVEL SECURITY;

-- Ensure operator_role exists before referencing it in policies.
-- In Supabase, custom roles must be created explicitly; built-in roles
-- (authenticated, anon, service_role) are available by default.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'operator_role') THEN
    CREATE ROLE operator_role NOLOGIN;
    GRANT USAGE ON SCHEMA public TO operator_role;
  END IF;
END $$;

-- =============================================================================
-- POLICY 1: service_role — Full unrestricted bypass (preserved)
-- =============================================================================
-- service_role is the backend/server key used by APEX agents and internal
-- services. It MUST retain full access to create, read, update all tasks.
DO $$
DECLARE
  tbl CONSTANT text := 'man_tasks';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = tbl AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access"
      ON public.man_tasks
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- POLICY 2: operator_role SELECT — Scoped to PENDING tasks only
-- =============================================================================
-- PREVIOUS: USING (true) — operator could read ALL tasks including decided
--   tasks from other operators/tenants. CRITICAL vulnerability.
-- NEW: Operators can only see tasks that are PENDING (awaiting decision).
--   Decided/expired tasks are no longer visible to prevent information leakage.
--
-- REVIEW REQUIRED: If per-operator task assignment is implemented in the future,
--   add a column (e.g., assigned_to UUID REFERENCES auth.users(id)) and tighten
--   this policy to: USING (status = 'PENDING' AND assigned_to = auth.uid())
-- =============================================================================
DO $$
DECLARE
  tbl CONSTANT text := 'man_tasks';
BEGIN
  -- Drop the old wide-open policy if it exists, then recreate with scoped predicate
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = tbl AND policyname = 'operator_select'
      AND qual::text LIKE '%PENDING%'
  ) THEN
    -- Remove stale policy (may have USING(true)) before recreating
    -- additive-allow: DROP_POLICY replacing stale operator_select policy to apply corrected USING clause
    DROP POLICY IF EXISTS "operator_select" ON public.man_tasks;
    CREATE POLICY "operator_select"
      ON public.man_tasks
      FOR SELECT
      TO operator_role
      USING (status = 'PENDING');
  END IF;
END $$;

-- =============================================================================
-- POLICY 3: operator_role UPDATE — Scoped to PENDING tasks + identity binding
-- =============================================================================
-- PREVIOUS: USING (true) WITH CHECK (true) — operator could update ANY task
--   including already-decided tasks. CRITICAL vulnerability.
-- NEW:
--   USING:       Only rows with status = 'PENDING' are visible for update.
--                Operators cannot modify already-decided or expired tasks.
--   WITH CHECK:  After update, decided_by MUST equal auth.uid(). This prevents
--                operators from attributing decisions to other users and
--                creates an immutable audit trail binding decision to identity.
--
-- NOTE: The table has no tenant_id or user_id column. The decided_by column
--   (TEXT) is the closest identity binding available. If decided_by stores
--   something other than auth.uid()::text (e.g., email or username), adjust
--   the WITH CHECK accordingly. Flagged for Manual Approval Node review.
-- REVIEW REQUIRED: Confirm decided_by stores auth.uid()::text at the
--   application layer. If it stores email, change to:
--   WITH CHECK (decided_by = (SELECT email FROM auth.users WHERE id = auth.uid()))
-- =============================================================================
DO $$
DECLARE
  tbl CONSTANT text := 'man_tasks';
BEGIN
  -- Drop the old wide-open policy if it exists, then recreate with scoped predicate
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = tbl AND policyname = 'operator_update'
      AND qual::text LIKE '%PENDING%'
  ) THEN
    -- Remove stale policy (may have USING(true)) before recreating
    -- additive-allow: DROP_POLICY replacing stale operator_update policy to apply corrected USING clause
    DROP POLICY IF EXISTS "operator_update" ON public.man_tasks;
    CREATE POLICY "operator_update"
      ON public.man_tasks
      FOR UPDATE
      TO operator_role
      USING (status = 'PENDING')
      WITH CHECK (decided_by = auth.uid()::text);
  END IF;
END $$;
