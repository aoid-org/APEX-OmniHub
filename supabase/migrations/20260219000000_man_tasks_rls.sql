ALTER TABLE public.man_tasks ENABLE ROW LEVEL SECURITY;

-- Ensure operator_role exists before referencing it in policies.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'operator_role') THEN
    CREATE ROLE operator_role NOLOGIN;
    GRANT USAGE ON SCHEMA public TO operator_role;
  END IF;
END $$;

-- Recreate policies with strict tenant/user ownership checks.
DROP POLICY IF EXISTS "service_role_full_access" ON public.man_tasks;
DROP POLICY IF EXISTS "operator_select" ON public.man_tasks;
DROP POLICY IF EXISTS "operator_update" ON public.man_tasks;

CREATE POLICY "service_role_full_access"
ON public.man_tasks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DO $$
DECLARE
  isolation_column text;
BEGIN
  -- Prefer tenant_id for multi-tenant isolation; fallback to user_id.
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'man_tasks' AND column_name = 'tenant_id'
    ) THEN 'tenant_id'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'man_tasks' AND column_name = 'user_id'
    ) THEN 'user_id'
    ELSE NULL
  END INTO isolation_column;

  IF isolation_column IS NULL THEN
    RAISE EXCEPTION 'man_tasks must contain tenant_id or user_id for operator RLS isolation';
  END IF;

  EXECUTE format(
    'CREATE POLICY "operator_select" ON public.man_tasks FOR SELECT TO operator_role USING (%I::uuid = auth.uid())',
    isolation_column
  );

  EXECUTE format(
    'CREATE POLICY "operator_update" ON public.man_tasks FOR UPDATE TO operator_role USING (%1$I::uuid = auth.uid()) WITH CHECK (%1$I::uuid = auth.uid())',
    isolation_column
  );
END $$;
