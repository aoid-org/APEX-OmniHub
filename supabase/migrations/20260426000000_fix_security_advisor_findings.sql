-- Remediates Supabase Security Advisor findings:
-- 1) Security Definer View warnings for public.user_provider_connections_safe and public.active_idempotency_receipts
-- 2) RLS Disabled in Public warnings for selected public tables

BEGIN;

-- Ensure exposed views run with invoker privileges instead of definer privileges.
ALTER VIEW IF EXISTS public.user_provider_connections_safe SET (security_invoker = true);
ALTER VIEW IF EXISTS public.active_idempotency_receipts SET (security_invoker = true);

DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY[
    'media_assets',
    'leagues',
    'products',
    'product_media',
    'ingest_jobs',
    'ingest_artifacts',
    'armageddon_runs',
    'armageddon_events',
    'ingest_parse_results',
    'ingest_dead_letters'
  ];
  policy_name text;
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      -- Enable RLS for PostgREST-exposed tables.
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      -- Preserve backend/service access under RLS while blocking anonymous/authenticated access by default.
      policy_name := format('%s_service_role_all', tbl);
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = tbl
          AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
          policy_name,
          tbl
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

COMMIT;
