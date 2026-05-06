ALTER TABLE public.man_tasks ENABLE ROW LEVEL SECURITY;

-- Ensure operator_role exists before referencing it in policies.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'operator_role') THEN
    CREATE ROLE operator_role NOLOGIN;
    GRANT USAGE ON SCHEMA public TO operator_role;
  END IF;
END $$;

DO $$
DECLARE
  tbl CONSTANT text := 'man_tasks';
  isolation_column text;
BEGIN
  -- Replace policies deterministically before guarded re-create.
  DROP POLICY IF EXISTS "service_role_full_access" ON public.man_tasks;
  DROP POLICY IF EXISTS "operator_select" ON public.man_tasks;
  DROP POLICY IF EXISTS "operator_update" ON public.man_tasks;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access' AND tablename = tbl
  ) THEN
    CREATE POLICY "service_role_full_access"
      ON public.man_tasks
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Prefer tenant_id for multi-tenant isolation; fallback to user_id.
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id'
    ) THEN 'tenant_id'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'user_id'
    ) THEN 'user_id'
    ELSE NULL
  END INTO isolation_column;

  IF isolation_column IS NULL THEN
    RAISE EXCEPTION 'man_tasks must contain tenant_id or user_id for operator RLS isolation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'operator_select' AND tablename = tbl
  ) THEN
    EXECUTE format(
      'CREATE POLICY "operator_select" ON public.%I FOR SELECT TO operator_role USING (%I::uuid = auth.uid())',
      tbl,
      isolation_column
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'operator_update' AND tablename = tbl
  ) THEN
    EXECUTE format(
      'CREATE POLICY "operator_update" ON public.%I FOR UPDATE TO operator_role USING (%2$I::uuid = auth.uid()) WITH CHECK (%2$I::uuid = auth.uid())',
      tbl,
      isolation_column
    );
  END IF;
END $$;
