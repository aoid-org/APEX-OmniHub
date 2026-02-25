BEGIN;

DO $$
DECLARE
  missing_count int;
  table_count int;
BEGIN
  SELECT count(*) INTO missing_count
  FROM (VALUES ('public'), ('auth')) AS req(schema_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.schemata s WHERE s.schema_name = req.schema_name
  );

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Pre-launch integrity failed: required schemas missing';
  END IF;

  SELECT count(*) INTO table_count
  FROM pg_tables
  WHERE schemaname IN ('public', 'auth');

  IF table_count < 10 THEN
    RAISE EXCEPTION 'Pre-launch integrity failed: expected >= 10 tables across public/auth, got %', table_count;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='workflows') THEN
    RAISE EXCEPTION 'Pre-launch integrity failed: public.workflows table missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='workflow_runs') THEN
    RAISE EXCEPTION 'Pre-launch integrity failed: public.workflow_runs table missing';
  END IF;
END $$;

COMMIT;
