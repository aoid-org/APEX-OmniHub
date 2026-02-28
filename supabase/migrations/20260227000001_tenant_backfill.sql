-- Migration: Tenant Data Backfill (Idempotent)
-- Dependencies: 20260227000000_tenant_schema_init.sql
-- Rollback: See docs/migrations/rollback-procedures.md

DO $$ 
DECLARE
  user_record RECORD;
  personal_tenant_id UUID;
  backfill_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting Personal Tenant generation for all users...';

  -- Loop through all users without a personal tenant
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data->>'full_name' AS full_name
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tenant_members tm 
      WHERE tm.user_id = u.id
    )
  LOOP
    -- Create Personal Tenant (idempotent via ON CONFLICT)
    INSERT INTO public.tenants (name, created_at)
    VALUES (
      COALESCE(user_record.full_name, user_record.email, 'User ' || user_record.id::text) || '''s Personal Workspace',
      NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO personal_tenant_id;

    -- If tenant was just created, link user as admin
    IF personal_tenant_id IS NOT NULL THEN
      INSERT INTO public.tenant_members (user_id, tenant_id, role)
      VALUES (user_record.id, personal_tenant_id, 'admin')
      ON CONFLICT (user_id, tenant_id) DO NOTHING;

      backfill_count := backfill_count + 1;

      -- Backfill operational tables in batches
      -- Batch 1: idempotency_receipts
      UPDATE public.idempotency_receipts
      SET tenant_id = personal_tenant_id
      WHERE tenant_id IS NULL
        AND (
          request_payload->>'user_id' = user_record.id::text 
          OR metadata->>'user_id' = user_record.id::text
        );

      -- Batch 2: audit_logs
      UPDATE public.audit_logs
      SET tenant_id = personal_tenant_id
      WHERE tenant_id IS NULL
        AND actor_id = user_record.id;

      -- Batch 3: man_tasks
      UPDATE public.man_tasks
      SET tenant_id = personal_tenant_id
      WHERE tenant_id IS NULL
        AND workflow_id LIKE '%' || user_record.id::text || '%';

      -- Batch 4: omnitrace_runs
      UPDATE public.omnitrace_runs
      SET tenant_id = personal_tenant_id
      WHERE tenant_id IS NULL
        AND user_id = user_record.id;

      -- Batch 5: omnitrace_events
      UPDATE public.omnitrace_events
      SET tenant_id = personal_tenant_id
      WHERE tenant_id IS NULL
        AND run_id IN (
          SELECT id FROM public.omnitrace_runs WHERE user_id = user_record.id
        );

      IF backfill_count % 100 = 0 THEN
        RAISE NOTICE '  Progress: % users migrated', backfill_count;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Phase 2 Complete: % Personal Tenants created and backfilled', backfill_count;
END $$;