ALTER TABLE public.man_tasks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl CONSTANT text := 'man_tasks';
BEGIN
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'operator_select' AND tablename = tbl
  ) THEN
    CREATE POLICY "operator_select"
    ON public.man_tasks
    FOR SELECT
    TO operator_role
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'operator_update' AND tablename = tbl
  ) THEN
    CREATE POLICY "operator_update"
    ON public.man_tasks
    FOR UPDATE
    TO operator_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
