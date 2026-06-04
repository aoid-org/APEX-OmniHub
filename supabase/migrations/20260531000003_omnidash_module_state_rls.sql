-- Ensure all module tables are accessible by authenticated users via RLS
-- These tables were created but RLS policies may be incomplete

-- automations table (from old migration) — add user_id RLS if missing
DO $$
DECLARE
  v_table_automations text := 'automations';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = v_table_automations -- NOSONAR
      AND policyname = 'automations_owner_rls'
  ) THEN
    ALTER TABLE IF EXISTS public.automations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users;
    CREATE POLICY "automations_owner_rls" ON public.automations
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- connector_sessions: add anon user policy for tenant_id = auth.uid()::text
DO $$
DECLARE
  v_table_connector text := 'connector_sessions';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = v_table_connector -- NOSONAR
      AND policyname = 'connector_sessions_user_rls'
  ) THEN
    CREATE POLICY "connector_sessions_user_rls" ON public.connector_sessions
      FOR ALL TO authenticated
      USING (tenant_id = auth.uid()::text)
      WITH CHECK (tenant_id = auth.uid()::text);
  END IF;
END $$;

-- omnitrace_events read policy (already exists, but ensure it's broad enough)
-- physiomni_devices: ensure user can read their own devices
DO $$
DECLARE
  v_table_devices text := 'physiomni_devices';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = v_table_devices -- NOSONAR
      AND policyname = 'physiomni_devices_user_rls'
  ) THEN
    CREATE POLICY "physiomni_devices_user_rls" ON public.physiomni_devices
      FOR SELECT TO authenticated
      USING (tenant_id = auth.uid()::text);
  END IF;
END $$;
