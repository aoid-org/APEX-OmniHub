-- Migration: Idempotency Composite Key (Cross-Tenant Isolation)
-- Dependencies: 20260227000003_jwt_rls_policies.sql
-- Rollback: DROP INDEX idx_idempotency_tenant_key;
--           ALTER TABLE idempotency_receipts DROP CONSTRAINT IF EXISTS unique_idempotency_per_tenant;

BEGIN;

-- Drop old UNIQUE constraint on idempotency_key
ALTER TABLE public.idempotency_receipts 
  DROP CONSTRAINT IF EXISTS idempotency_receipts_idempotency_key_key;

-- Add composite UNIQUE constraint (idempotency_key, tenant_id)
ALTER TABLE public.idempotency_receipts
  ADD CONSTRAINT unique_idempotency_per_tenant 
  UNIQUE (idempotency_key, tenant_id);

-- Create composite index for fast lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_tenant_key 
  ON public.idempotency_receipts(tenant_id, idempotency_key);

COMMENT ON CONSTRAINT unique_idempotency_per_tenant ON public.idempotency_receipts IS
  'Prevents cross-tenant state bleeding: same idempotency_key can exist in different tenants.';

RAISE NOTICE '✓ Phase 5 Complete: Idempotency composite key enforced. Cross-tenant isolation guaranteed.';

COMMIT;