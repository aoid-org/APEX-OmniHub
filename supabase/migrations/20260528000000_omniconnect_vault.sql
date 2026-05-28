-- =============================================================================
-- OmniConnect Vault & OmniBridge States (Prompt 7 & 8)
-- =============================================================================

-- 1. Extend OmniBridge Dispatch States (Prompt 7)
-- Postgres ALTER TYPE ADD VALUE cannot be executed in a transaction block
-- if not careful, but Supabase handles these fine outside transactions or
-- wrapped via DO blocks if needed. We do it safely:
COMMIT;

DO $$
BEGIN
  ALTER TYPE omnibridge_dispatch_state ADD VALUE IF NOT EXISTS 'accepted';
  ALTER TYPE omnibridge_dispatch_state ADD VALUE IF NOT EXISTS 'normalized';
  ALTER TYPE omnibridge_dispatch_state ADD VALUE IF NOT EXISTS 'persisted';
  ALTER TYPE omnibridge_dispatch_state ADD VALUE IF NOT EXISTS 'failed_retryable';
  ALTER TYPE omnibridge_dispatch_state ADD VALUE IF NOT EXISTS 'failed_terminal';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

BEGIN;

-- 2. Create OmniConnect Sessions Vault (Prompt 8)
CREATE TABLE IF NOT EXISTS connector_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL, -- Encrypted token blob
  encryption_key_id TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(tenant_id, connector_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_sessions_tenant 
  ON connector_sessions(tenant_id, provider);

ALTER TABLE connector_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connector_sessions'
      AND policyname = 'connector_sessions_service_all'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "connector_sessions_service_all"
        ON connector_sessions FOR ALL TO service_role
        USING (TRUE) WITH CHECK (TRUE)
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connector_sessions'
      AND policyname = 'connector_sessions_tenant_isolation'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "connector_sessions_tenant_isolation"
        ON connector_sessions FOR ALL TO authenticated
        USING (
          tenant_id = COALESCE(
            (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
            ''
          )
        )
    $pol$;
  END IF;
END$$;

COMMIT;
